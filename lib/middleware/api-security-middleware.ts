/**
 * API Security Middleware
 * GitHub Security Alert #78 - Next.js API Routes包括的セキュリティ
 */

import { NextRequest, NextResponse } from 'next/server';
import { XSSProtectionEnhanced } from '@/lib/security/xss-protection-enhanced';
import { NoSQLInjectionProtection } from '@/lib/security/nosql-injection-protection';
import { ServerActionsCSRF } from '@/lib/security/server-actions-csrf';
import { createHash } from 'crypto';

export class APISecurityMiddleware {
  private static readonly RATE_LIMIT_WINDOW = 60000; // 1分
  private static readonly MAX_REQUESTS_PER_WINDOW = 100;
  private static rateLimitStore = new Map<string, RateLimitEntry>();

  /**
   * API Routes用包括的セキュリティミドルウェア
   */
  static async secureAPIRoute(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      // 1. レート制限チェック
      const rateLimitResult = await this.checkRateLimit(request);
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult, requestId);
      }

      // 2. 入力検証とサニタイゼーション
      const validationResult = await this.validateRequest(request);
      if (!validationResult.valid) {
        return this.validationErrorResponse(validationResult, requestId);
      }

      // 3. CSRF保護（POST/PUT/DELETE/PATCH）
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const csrfResult = await this.validateCSRF(request);
        if (!csrfResult.valid) {
          return this.csrfErrorResponse(csrfResult, requestId);
        }
      }

      // 4. セキュリティヘッダー付きリクエスト処理
      const response = await handler(request);

      // 5. レスポンスのサニタイゼーション
      const secureResponse = await this.sanitizeResponse(response);

      // 6. セキュリティヘッダー追加
      this.addSecurityHeaders(secureResponse, requestId);

      // 7. 監査ログ記録
      await this.logAPIAccess({
        requestId,
        method: request.method,
        url: request.url,
        statusCode: secureResponse.status,
        duration: Date.now() - startTime,
        ip: this.getClientIP(request)
      });

      return secureResponse;

    } catch (error) {
      // エラーハンドリング
      console.error(`API Security Error [${requestId}]:`, error);

      return NextResponse.json(
        {
          error: 'Security validation failed',
          requestId: requestId,
          message: process.env.NODE_ENV === 'production'
            ? 'Request could not be processed securely'
            : (error as Error).message
        },
        {
          status: 403,
          headers: {
            'X-Request-ID': requestId,
            'X-Security-Version': '2.0'
          }
        }
      );
    }
  }

  /**
   * レート制限チェック
   */
  private static async checkRateLimit(request: NextRequest): Promise<RateLimitResult> {
    const clientIP = this.getClientIP(request);
    const apiKey = request.headers.get('X-API-Key');

    // APIキーがある場合は高めの制限
    const maxRequests = apiKey ? 200 : this.MAX_REQUESTS_PER_WINDOW;

    // レート制限キーの生成
    const rateLimitKey = apiKey || clientIP;
    const now = Date.now();

    // 既存のエントリを取得または作成
    let entry = this.rateLimitStore.get(rateLimitKey);

    if (!entry || now - entry.windowStart > this.RATE_LIMIT_WINDOW) {
      // 新しいウィンドウ
      entry = {
        windowStart: now,
        count: 1,
        blocked: false
      };
      this.rateLimitStore.set(rateLimitKey, entry);
    } else {
      // 既存ウィンドウ内
      entry.count++;

      if (entry.count > maxRequests) {
        entry.blocked = true;
      }
    }

    // 古いエントリのクリーンアップ
    this.cleanupRateLimitStore();

    if (entry.blocked) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.windowStart + this.RATE_LIMIT_WINDOW
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.windowStart + this.RATE_LIMIT_WINDOW
    };
  }

  /**
   * レート制限ストアのクリーンアップ
   */
  private static cleanupRateLimitStore(): void {
    const now = Date.now();
    const cutoff = now - this.RATE_LIMIT_WINDOW * 2;

    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (entry.windowStart < cutoff) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * リクエスト入力検証
   */
  private static async validateRequest(request: NextRequest): Promise<ValidationResult> {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // クエリパラメータ検証
    for (const [key, value] of searchParams.entries()) {
      // キー名の検証
      if (!/^[a-zA-Z0-9_-]+$/.test(key) || key.length > 50) {
        return {
          valid: false,
          reason: 'INVALID_PARAMETER_NAME',
          parameter: key
        };
      }

      // NoSQL Injection チェック
      if (!NoSQLInjectionProtection.validateQueryObject({ [key]: value })) {
        return {
          valid: false,
          reason: 'NOSQL_INJECTION_DETECTED',
          parameter: key
        };
      }

      // XSS パターンチェック
      const sanitizedValue = XSSProtectionEnhanced.sanitizeForOutput(value);
      if (sanitizedValue !== value) {
        return {
          valid: false,
          reason: 'XSS_PATTERN_DETECTED',
          parameter: key
        };
      }

      // 値の長さ制限
      if (value.length > 1000) {
        return {
          valid: false,
          reason: 'VALUE_TOO_LONG',
          parameter: key
        };
      }
    }

    // リクエストボディ検証（POST/PUT/PATCH）
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const contentType = request.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          const body = await request.clone().json();

          // NoSQL Injection チェック
          if (!NoSQLInjectionProtection.validateQueryObject(body)) {
            return {
              valid: false,
              reason: 'NOSQL_INJECTION_IN_BODY'
            };
          }

          // ボディサイズチェック（1MB制限）
          const bodySize = JSON.stringify(body).length;
          if (bodySize > 1048576) {
            return {
              valid: false,
              reason: 'BODY_TOO_LARGE'
            };
          }
        }
      } catch (error) {
        // JSON解析エラー
        return {
          valid: false,
          reason: 'INVALID_JSON_BODY'
        };
      }
    }

    return { valid: true };
  }

  /**
   * CSRF検証
   */
  private static async validateCSRF(request: NextRequest): Promise<CSRFResult> {
    // APIルート用のCSRF検証
    const isValid = await ServerActionsCSRF.validateAPIRoute(request);

    return {
      valid: isValid,
      reason: isValid ? undefined : 'INVALID_CSRF_TOKEN'
    };
  }

  /**
   * レスポンスサニタイゼーション
   */
  private static async sanitizeResponse(response: NextResponse): Promise<NextResponse> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        const data = await response.json();
        const sanitizedData = XSSProtectionEnhanced.sanitizeForOutput(data);

        return NextResponse.json(sanitizedData, {
          status: response.status,
          headers: response.headers
        });
      } catch {
        // JSON解析エラーの場合はそのまま返却
        return response;
      }
    }

    return response;
  }

  /**
   * セキュリティヘッダー追加
   */
  private static addSecurityHeaders(response: NextResponse, requestId: string): void {
    // 基本的なセキュリティヘッダー
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy（環境に応じて調整）
    const csp = process.env.NODE_ENV === 'production'
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
      : "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';";
    response.headers.set('Content-Security-Policy', csp);

    // 追加のセキュリティヘッダー
    response.headers.set('X-Request-ID', requestId);
    response.headers.set('X-Security-Version', '2.0');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

    // CORS ヘッダー（必要に応じて）
    if (process.env.ALLOWED_ORIGIN) {
      response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }

  /**
   * クライアントIP取得
   */
  private static getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           request.headers.get('x-real-ip') ||
           request.headers.get('cf-connecting-ip') || // Cloudflare
           request.headers.get('x-client-ip') ||
           'unknown';
  }

  /**
   * APIアクセスログ記録
   */
  private static async logAPIAccess(log: APIAccessLog): Promise<void> {
    // 本番環境では外部ロギングサービスに送信
    if (process.env.NODE_ENV === 'production') {
      // TODO: Supabaseやその他のロギングサービスに記録
      console.log('API Access Log:', JSON.stringify(log));
    } else {
      // 開発環境ではコンソール出力
      console.log(`[${log.requestId}] ${log.method} ${log.url} - ${log.statusCode} (${log.duration}ms)`);
    }
  }

  /**
   * レート制限レスポンス
   */
  private static rateLimitResponse(result: RateLimitResult, requestId: string): NextResponse {
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        requestId: requestId,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(this.MAX_REQUESTS_PER_WINDOW),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetTime),
          'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000))
        }
      }
    );
  }

  /**
   * 検証エラーレスポンス
   */
  private static validationErrorResponse(result: ValidationResult, requestId: string): NextResponse {
    const message = process.env.NODE_ENV === 'production'
      ? 'Invalid request parameters'
      : `Validation failed: ${result.reason} ${result.parameter ? `(${result.parameter})` : ''}`;

    return NextResponse.json(
      {
        error: 'Bad Request',
        message: message,
        requestId: requestId
      },
      { status: 400 }
    );
  }

  /**
   * CSRFエラーレスポンス
   */
  private static csrfErrorResponse(result: CSRFResult, requestId: string): NextResponse {
    return NextResponse.json(
      {
        error: 'Forbidden',
        message: 'CSRF validation failed',
        requestId: requestId
      },
      { status: 403 }
    );
  }
}

// 型定義
interface RateLimitEntry {
  windowStart: number;
  count: number;
  blocked: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
  parameter?: string;
}

interface CSRFResult {
  valid: boolean;
  reason?: string;
}

interface APIAccessLog {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  ip: string;
}

export type { RateLimitResult, ValidationResult, CSRFResult, APIAccessLog };