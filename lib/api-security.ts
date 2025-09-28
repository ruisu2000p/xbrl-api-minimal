import crypto from 'crypto';
import { NextRequest } from 'next/server';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export class ApiSecurity {
  private static instance: ApiSecurity;
  private keyDeriveSalt: Buffer;

  private constructor() {
    this.keyDeriveSalt = crypto.randomBytes(SALT_LENGTH);
  }

  static getInstance(): ApiSecurity {
    if (!ApiSecurity.instance) {
      ApiSecurity.instance = new ApiSecurity();
    }
    return ApiSecurity.instance;
  }

  deriveKey(secret: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(secret, salt as unknown as crypto.BinaryLike, 100000, KEY_LENGTH, 'sha256');
  }

  encryptApiKey(apiKey: string, secret: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = this.deriveKey(secret, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(apiKey, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([salt, iv, tag, encrypted]);

    return combined.toString('base64');
  }

  decryptApiKey(encryptedKey: string, secret: string): string | null {
    try {
      const combined = Buffer.from(encryptedKey, 'base64');

      const salt = combined.slice(0, SALT_LENGTH);
      const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
      const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

      const key = this.deriveKey(secret, salt);
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(new Uint8Array(tag));

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return null;
    }
  }

  hashApiKey(apiKey: string): string {
    // Use PBKDF2 for better security instead of simple SHA256
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(apiKey, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  verifyApiKeyHash(apiKey: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;

    const testHash = crypto.pbkdf2Sync(apiKey, salt, 100000, 64, 'sha512').toString('hex');
    // Use timing-safe comparison
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(testHash));
  }

  async verifyApiKey(apiKey: string, supabase: any): Promise<boolean> {
    try {
      // Get all active keys to check against
      const { data: keys, error } = await supabase
        .from('api_keys')
        .select('id, tier, is_active, key_hash')
        .eq('is_active', true);

      if (error || !keys) {
        return false;
      }

      // Check each key with timing-safe comparison
      let validKey = null;
      for (const key of keys) {
        if (this.verifyApiKeyHash(apiKey, key.key_hash)) {
          validKey = key;
          break;
        }
      }

      if (!validKey) {
        return false;
      }

      const data = validKey;

      // APIキー使用ログを記録
      await supabase
        .from('api_key_usage_logs')
        .insert({
          api_key_id: data.id,
          endpoint: 'api_verification',
          timestamp: new Date().toISOString(),
        });

      return true;
    } catch (error) {
      console.error('API key verification failed:', error);
      return false;
    }
  }

  checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (entry.count >= maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }

  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  validateInputSanitization(input: string): boolean {
    // SQLインジェクション対策パターン
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi,
      /(--|\/\*|\*\/|xp_|sp_|0x)/gi,
    ];

    // XSS対策パターン - More comprehensive patterns
    const xssPatterns = [
      /<script[^>]*>[\s\S]*?<\/script[^>]*>/gi,
      /<script[^>]*\/>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>[\s\S]*?<\/iframe[^>]*>/gi,
      /<embed[^>]*>/gi,
      /<object[^>]*>[\s\S]*?<\/object[^>]*>/gi,
    ];

    for (const pattern of [...sqlPatterns, ...xssPatterns]) {
      if (pattern.test(input)) {
        return false;
      }
    }

    return true;
  }

  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };
  }

  async logSecurityEvent(
    eventType: string,
    details: any,
    supabase: any
  ): Promise<void> {
    try {
      await supabase
        .from('security_audit_logs')
        .insert({
          event_type: eventType,
          details: JSON.stringify(details),
          timestamp: new Date().toISOString(),
          ip_address: details.ip_address || null,
          user_agent: details.user_agent || null,
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  detectSuspiciousActivity(request: NextRequest): boolean {
    const userAgent = request.headers.get('user-agent') || '';
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /masscan/i,
      /nmap/i,
      /burp/i,
      /metasploit/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(userAgent)) {
        return true;
      }
    }

    // 異常なリクエストヘッダーの検出
    const headers = request.headers;
    if (headers && headers.get('x-forwarded-for')?.split(',').length && headers.get('x-forwarded-for')!.split(',').length > 5) {
      return true;
    }

    return false;
  }
}

// サーバレス環境での setInterval 問題を回避
// Vercel, AWS Lambda, Netlify Functions などではsetIntervalを使用しない
const isServerless =
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NETLIFY ||
  process.env.NODE_ENV === 'test';

if (!isServerless) {
  // 通常のNode.js環境でのみ定期クリーンアップを実行
  const cleanupInterval = setInterval(() => {
    ApiSecurity.getInstance().cleanupRateLimitStore();
  }, 60000);

  // プロセス終了時にインターバルをクリア
  if (typeof process !== 'undefined') {
    process.on('beforeExit', () => {
      clearInterval(cleanupInterval);
    });
  }
} else {
  // サーバレス環境ではリクエストごとにクリーンアップ
  // cleanupRateLimitStore() はcheckRateLimit内で自動的に呼ばれる
  console.log('Running in serverless environment - setInterval disabled');
}

export default ApiSecurity.getInstance();