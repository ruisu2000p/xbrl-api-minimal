import { NextRequest } from 'next/server';

/**
 * メモリベースのレート制限ストア
 * Upstash Redis が利用できない場合のフォールバック
 */
let memoryStore = new Map<string, number[]>();

/**
 * メモリベースのレート制限チェック
 */
function memLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const start = now - windowMs;

  // 古いタイムスタンプを削除
  const arr = (memoryStore.get(key) || []).filter(t => t > start);

  if (arr.length >= max) {
    return false; // レート制限超過
  }

  arr.push(now);
  memoryStore.set(key, arr);
  return true;
}

/**
 * SHA-256 ハッシュを生成（メールアドレスのハッシュ化用）
 */
async function sha256(s: string): Promise<string> {
  const data = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Buffer.from(new Uint8Array(data)).toString('hex').slice(0, 16);
}

/**
 * レート制限の設定
 */
const rateLimitConfigs = {
  login: { max: 5, windowMs: 60_000 },              // 1分間に5回
  password_reset: { max: 3, windowMs: 60 * 60_000 }, // 1時間に3回
  subscription: { max: 60, windowMs: 60_000 },       // 1分間に60回
  api_key_gen: { max: 10, windowMs: 24 * 60 * 60_000 }, // 1日に10回
} as const;

type RateLimitKind = keyof typeof rateLimitConfigs;

/**
 * レート制限チェック（Upstash Redis優先、フォールバックでメモリ）
 *
 * アカウント列挙対策として、IPとメールアドレスのハッシュを組み合わせたキーを使用
 *
 * @param kind レート制限の種類
 * @param request NextRequest object
 * @param email オプション：メールアドレス（ログインやパスワードリセット時）
 * @throws Response 429 if rate limit exceeded
 *
 * @example
 * await limitOrThrow('login', request, 'user@example.com');
 */
export async function limitOrThrow(
  kind: RateLimitKind,
  request: NextRequest,
  email?: string
): Promise<void> {
  // IPアドレスを取得（X-Forwarded-For優先）
  const ip =
    request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '0.0.0.0';

  // メールアドレスがある場合はハッシュ化（アカウント列挙対策）
  const emailKey = email ? await sha256(email.toLowerCase().trim()) : '';

  // レート制限キー（IP + メールハッシュの組み合わせ）
  const key = `${kind}:${ip}:${emailKey}`;

  const config = rateLimitConfigs[kind];

  // Upstash Redis が設定されている場合
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const bucket = `${key}:${Math.floor(now / (config.windowMs / 1000))}`;
      const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;

      // INCR コマンドでカウントを増加
      const incrUrl = `${baseUrl}/incr/${encodeURIComponent(bucket)}`;
      const incrResponse = await fetch(incrUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { result } = await incrResponse.json();

      // 初回アクセスの場合、TTLを設定
      if (result === 1) {
        const expireUrl = `${baseUrl}/pexpire/${encodeURIComponent(bucket)}/${config.windowMs}`;
        await fetch(expireUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      // レート制限超過チェック
      if (result > config.max) {
        console.error('🚨 Security: Rate limit exceeded (Redis)', {
          kind,
          ip,
          count: result,
          max: config.max
        });

        throw new Response(
          JSON.stringify({ error: 'Too many requests. Please try again later.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil(config.windowMs / 1000).toString()
            }
          }
        );
      }
    } catch (error) {
      // Redis エラーの場合はフォールバックせず、エラーをスロー
      if (error instanceof Response) {
        throw error;
      }
      console.error('Rate limit Redis error:', error);
      // フォールバック: メモリベースに切り替え
    }
  }

  // メモリベースのレート制限（Upstashがない場合、またはRedisエラー時）
  const ok = memLimit(key, config.max, config.windowMs);

  if (!ok) {
    console.error('🚨 Security: Rate limit exceeded (memory)', {
      kind,
      ip,
      max: config.max
    });

    throw new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(config.windowMs / 1000).toString()
        }
      }
    );
  }
}

/**
 * メモリストアのクリーンアップ（定期実行推奨）
 *
 * 本番環境では不要（Upstash Redis使用）
 * 開発環境でメモリリークを防ぐため
 */
export function cleanupMemoryStore(): void {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60_000;

  for (const [key, timestamps] of memoryStore.entries()) {
    const recentTimestamps = timestamps.filter(t => t > oneHourAgo);

    if (recentTimestamps.length === 0) {
      memoryStore.delete(key);
    } else {
      memoryStore.set(key, recentTimestamps);
    }
  }
}

// 開発環境では1時間ごとにクリーンアップ
if (process.env.NODE_ENV !== 'production') {
  setInterval(cleanupMemoryStore, 60 * 60_000);
}
