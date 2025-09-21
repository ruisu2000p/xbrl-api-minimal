// Supabase Edge Function: api-proxy (dynamic FY for Free tier)
// Changes:
// - Free tier now auto-restricts to the most recent two fiscal years.
// - Fiscal year rollover month is configurable via env XBRL_FY_START_MONTH (1-12, default 4).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { Hono } from "npm:hono@4.6.7";
import { cors } from "npm:hono@4.6.7/cors";

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Config: fiscal year start month (1-12). Default: 4 (April-start FY like JP)
const FISCAL_YEAR_START_MONTH = (() => {
  const raw = Deno.env.get('XBRL_FY_START_MONTH');
  const n = raw ? Number(raw) : 4;
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : 4;
})();

// Service-role client
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
  global: { headers: { 'X-Client-Info': 'api-proxy/1.1.0' } },
});

// Helpers
const API_PREFIX = 'xbrl_v1_';

interface KeyContext {
  apiKey: string;
  userId: string | null;
  tier: 'free' | 'basic' | 'premium' | string;
  rateLimitPerMinute: number;
  keyHash: string; // hex
  apiKeyId: string; // uuid
}

function isValidApiKeyFormat(k: string | null): k is string {
  if (!k) return false;
  if (!k.startsWith(API_PREFIX)) return false;
  const body = k.slice(API_PREFIX.length);
  return /^[a-z0-9]{32}$/.test(body);
}

// Compute fiscal year label like 'FY2025'
function toFiscalYear(d: Date): string {
  // JavaScript months are 0-11, convert to 1-12
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  // If current month >= FY start month, FY is current year; else previous year
  const fy = month >= FISCAL_YEAR_START_MONTH ? year : year - 1;
  return `FY${fy}`;
}

function recentTwoFiscalYears(baseDate = new Date()): [string, string] {
  const curr = toFiscalYear(baseDate); // e.g., FY2025
  const n = Number(curr.slice(2));
  return [`FY${n}`, `FY${n - 1}`];
}

function nowMinuteBucket(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `m-${y}${m}${d}${hh}${mm}`;
}

async function resolveKeyContext(rawKey: string): Promise<KeyContext> {
  const { data, error } = await admin.rpc('verify_api_key_hash', { p_api_key: rawKey });
  if (error) throw new Error(`verify_api_key_hash failed: ${error.message}`);
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Invalid or inactive API key');
  }
  const row = data[0] as { user_id: string | null; tier: string; rate_limit: number; key_hash: string };

  const { data: keyRow, error: keyErr } = await admin
    .from('api_keys')
    .select('id, rate_limit_per_minute')
    .eq('key_hash', row.key_hash)
    .maybeSingle();

  if (keyErr) throw new Error(`api_keys lookup failed: ${keyErr.message}`);
  if (!keyRow) throw new Error('API key not found (hash mismatch)');

  const perMinute = Number.isFinite(row.rate_limit) && row.rate_limit > 0
    ? row.rate_limit
    : (keyRow.rate_limit_per_minute ?? 100);

  return {
    apiKey: rawKey,
    userId: row.user_id,
    tier: (row.tier || 'free') as KeyContext['tier'],
    rateLimitPerMinute: perMinute,
    keyHash: row.key_hash,
    apiKeyId: keyRow.id,
  };
}

async function checkAndIncrementRateLimit(ctx: KeyContext): Promise<{ allowed: boolean; remaining: number; resetAt: string }>{
  const bucket = nowMinuteBucket();
  const { data, error } = await admin.rpc('increment_rate_limit', {
    p_key_id: ctx.apiKeyId,
    p_bucket: bucket,
  });

  if (error) {
    const { data: rl, error: rlErr } = await admin
      .from('api_rate_limit')
      .select('count')
      .eq('key_id', ctx.apiKeyId)
      .eq('bucket', bucket)
      .maybeSingle();

    if (rlErr) throw new Error(`rate limit read failed: ${rlErr.message}`);

    if (!rl) {
      const { error: insErr } = await admin.from('api_rate_limit').insert({ key_id: ctx.apiKeyId, bucket, count: 1 });
      if (insErr) throw new Error(`rate limit insert failed: ${insErr.message}`);
      return { allowed: true, remaining: Math.max(0, ctx.rateLimitPerMinute - 1), resetAt: bucket };
    } else {
      if (rl.count >= ctx.rateLimitPerMinute) {
        return { allowed: false, remaining: 0, resetAt: bucket };
      }
      const { error: upErr } = await admin
        .from('api_rate_limit')
        .update({ count: rl.count + 1 })
        .eq('key_id', ctx.apiKeyId)
        .eq('bucket', bucket);
      if (upErr) throw new Error(`rate limit update failed: ${upErr.message}`);
      return { allowed: true, remaining: Math.max(0, ctx.rateLimitPerMinute - (rl.count + 1)), resetAt: bucket };
    }
  }

  const used = (data && typeof data.count === 'number') ? data.count : 1;
  const remaining = Math.max(0, ctx.rateLimitPerMinute - used);
  return { allowed: remaining > -1 && used <= ctx.rateLimitPerMinute, remaining, resetAt: bucket };
}

async function logUsage(ctx: KeyContext, args: {
  endpoint: string;
  method: string;
  status: number;
  latencyMs: number;
  ip?: string | null;
  meta?: Record<string, unknown>;
}) {
  const payload = {
    api_key_id: ctx.apiKeyId,
    endpoint: args.endpoint,
    request_count: 1,
    response_status: args.status,
    created_at: new Date().toISOString(),
  };
  await admin.from('api_key_usage_logs').insert(payload);

  await admin.from('api_usage_log').insert({
    key_id: ctx.apiKeyId,
    user_id: ctx.userId,
    endpoint: args.endpoint,
    method: args.method,
    status_code: args.status,
    latency_ms: args.latencyMs,
    ip_address: args.ip ?? null,
    metadata: args.meta ?? {},
  });
}

const withApiKey = () => async (c: any, next: any) => {
  const start = performance.now();
  const url = new URL(c.req.url);
  const endpoint = url.pathname;
  const method = c.req.method;
  const apiKey = c.req.header('x-api-key') || c.req.header('X-Api-Key');

  if (!isValidApiKeyFormat(apiKey)) {
    return c.json({ error: 'Missing or invalid API key format' }, 401);
  }

  let keyCtx: KeyContext | null = null;
  try {
    keyCtx = await resolveKeyContext(apiKey);
  } catch (e) {
    return c.json({ error: String(e instanceof Error ? e.message : e) }, 401);
  }

  try {
    const rl = await checkAndIncrementRateLimit(keyCtx);
    c.header('X-RateLimit-Limit', String(keyCtx.rateLimitPerMinute));
    c.header('X-RateLimit-Remaining', String(rl.remaining));
    c.header('X-RateLimit-Reset', rl.resetAt);

    if (!rl.allowed) {
      const latency = Math.round(performance.now() - start);
      // @ts-ignore
      EdgeRuntime.waitUntil(logUsage(keyCtx, { endpoint, method, status: 429, latencyMs: latency }));
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }
  } catch (e) {
    return c.json({ error: `Rate limit error: ${String(e instanceof Error ? e.message : e)}` }, 500);
  }

  c.set('keyCtx', keyCtx);
  await next();

  try {
    const latency = Math.round(performance.now() - start);
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null;
    const resStatus = c.res.status || 200;
    const logCtx = c.get('keyCtx') as KeyContext;
    // @ts-ignore
    EdgeRuntime.waitUntil(logUsage(logCtx, { endpoint, method, status: resStatus, latencyMs: latency, ip }));
  } catch (_) {}
};

const app = new Hono();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET','POST','OPTIONS'],
  allowHeaders: ['content-type','x-api-key']
}));

app.use('/api-proxy/*', withApiKey());

// GET /api-proxy/markdown-files
app.get('/api-proxy/markdown-files', async (c) => {
  const keyCtx = c.get('keyCtx') as KeyContext;
  const url = new URL(c.req.url);
  const companyId = url.searchParams.get('company_id');
  const fiscalYear = url.searchParams.get('fiscal_year');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '100'), 1000);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? '0'), 0);

  let q = admin
    .from('markdown_files_metadata')
    .select('id, company_id, company_name, fiscal_year, file_name, file_type, storage_path, file_size, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (companyId) q = q.eq('company_id', companyId);

  if (keyCtx.tier === 'free') {
    const [fyA, fyB] = recentTwoFiscalYears();
    q = q.in('fiscal_year', [fyA, fyB]);
  } else {
    if (fiscalYear) q = q.eq('fiscal_year', fiscalYear);
  }

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 400);

  return c.json({ data, tier: keyCtx.tier });
});

// Health check endpoint (no API key required)
app.get('/api-proxy/health', (c) => c.text('ok'));

// APIキー生成ヘルパー関数
function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `xbrl_v1_${key}`;
}

// SHA256ハッシュ生成
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 認証ミドルウェア（APIキー管理用）
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');

  // トークンからユーザー情報を取得
  const { data: { user }, error } = await admin.auth.getUser(token);

  if (error || !user) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  c.set('user', user);
  await next();
};

// POST /api-proxy/keys/create - APIキーの作成
app.post('/api-proxy/keys/create', authMiddleware, async (c) => {
  const user = c.get('user');
  const { name, tier = 'free' } = await c.req.json();

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return c.json({ error: 'APIキー名は必須です' }, 400);
  }

  try {
    // APIキーを生成
    const apiKey = generateApiKey();
    const keyHash = await sha256(apiKey);

    // ティアに基づいてレート制限を設定
    const rateLimits = {
      free: 60,
      basic: 300,
      premium: 1000
    };

    const rateLimit = rateLimits[tier as keyof typeof rateLimits] || 60;

    // データベースに保存
    const { data: keyData, error: insertError } = await admin
      .from('api_keys')
      .insert({
        user_id: user.id,
        name: name.trim(),
        key_hash: keyHash,
        tier: tier,
        rate_limit_per_minute: rateLimit,
        is_active: true,
        created_at: new Date().toISOString(),
        last_used_at: null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return c.json({ error: `APIキーの作成に失敗しました: ${insertError.message}` }, 500);
    }

    // 作成されたキーを返す（一度だけ表示）
    return c.json({
      success: true,
      apiKey: apiKey,
      keyId: keyData.id,
      name: keyData.name,
      tier: keyData.tier,
      rateLimit: keyData.rate_limit_per_minute,
      message: 'このAPIキーは一度だけ表示されます。安全な場所に保管してください。'
    });

  } catch (error) {
    console.error('Error creating API key:', error);
    return c.json({ error: 'APIキーの作成中にエラーが発生しました' }, 500);
  }
});

// GET /api-proxy/keys/list - ユーザーのAPIキー一覧を取得
app.get('/api-proxy/keys/list', authMiddleware, async (c) => {
  const user = c.get('user');

  try {
    const { data, error } = await admin
      .from('api_keys')
      .select('id, name, tier, rate_limit_per_minute, is_active, created_at, last_used_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('List error:', error);
      return c.json({ error: 'APIキーの取得に失敗しました' }, 500);
    }

    // キーハッシュは返さない（セキュリティのため）
    return c.json({
      success: true,
      keys: data || []
    });

  } catch (error) {
    console.error('Error listing API keys:', error);
    return c.json({ error: 'APIキーの取得中にエラーが発生しました' }, 500);
  }
});

// DELETE /api-proxy/keys/:id - APIキーの削除
app.delete('/api-proxy/keys/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const keyId = c.req.param('id');

  if (!keyId) {
    return c.json({ error: 'キーIDは必須です' }, 400);
  }

  try {
    // ユーザーが所有するキーのみ削除可能
    const { error } = await admin
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Delete error:', error);
      return c.json({ error: 'APIキーの削除に失敗しました' }, 500);
    }

    return c.json({
      success: true,
      message: 'APIキーが正常に削除されました'
    });

  } catch (error) {
    console.error('Error deleting API key:', error);
    return c.json({ error: 'APIキーの削除中にエラーが発生しました' }, 500);
  }
});

Deno.serve(app.fetch);