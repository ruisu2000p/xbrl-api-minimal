/**
 * Security Middleware
 * GitHub Security Alert #14 - 包括的セキュリティ検証
 */

import { NextRequest, NextResponse } from 'next/server';
import { SecureInputValidator, ValidationError } from '@/lib/security/input-validator';
import { createHash, randomUUID } from 'crypto';
import { logSecurityEvent } from '@/lib/security/security-monitor';

export interface SecurityValidationResult {
  valid: boolean;
  violations: string[];
  error?: string;
  code?: string;
  statusCode?: number;
  processingTime: number;
  requestId: string;
}

export interface SecurityAlert {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: string;
  details: any;
  timestamp: Date;
  requestId: string;
}

export class SecurityMiddleware {
  private static readonly RATE_LIMIT_WINDOW = 60000; // 1分
  private static readonly MAX_VIOLATIONS_PER_IP = 10;
  private static violationStore = new Map<string, { count: number; firstViolation: number }>();

  /**
   * リクエスト全体のセキュリティ検証
   */
  static async validateRequest(request: NextRequest, endpoint: string): Promise<SecurityValidationResult> {
    const startTime = Date.now();
    const requestId = randomUUID();
    const violations: string[] = [];

    try {
      // 1. HTTPヘッダー検証
      const headerValidation = SecureInputValidator.validateHeaders(request.headers);
      if (!headerValidation.valid) {
        violations.push(...headerValidation.violations);
      }

      // 2. IPベースの違反追跡
      const clientIp = this.getClientIp(request);
      if (this.hasExcessiveViolations(clientIp)) {
        return {
          valid: false,
          violations: ['EXCESSIVE_VIOLATIONS'],
          error: 'Too many security violations',
          code: 'RATE_LIMIT_SECURITY',
          statusCode: 429,
          processingTime: Date.now() - startTime,
          requestId
        };
      }

      // 3. URLパラメータ検証（GET）
      if (request.method === 'GET') {
        const searchParams = request.nextUrl.searchParams;
        const urlViolations = await this.validateUrlParameters(searchParams);
        violations.push(...urlViolations);
      }

      // 4. JSONペイロード検証（POST/PUT/PATCH）
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          try {
            const body = await request.clone().json();
            const bodyViolations = await this.validateJsonPayload(body);
            violations.push(...bodyViolations);
          } catch (error) {
            violations.push('INVALID_JSON_BODY');
          }
        }
      }

      // 5. エンドポイント固有の検証
      const endpointViolations = await this.validateEndpointSpecific(request, endpoint);
      violations.push(...endpointViolations);

      // 6. 違反があった場合の処理
      if (violations.length > 0) {
        this.recordViolation(clientIp);

        // セキュリティアラート発行とモニタリング
        if (violations.includes('SQL_INJECTION') || violations.includes('PATH_INJECTION')) {
          await this.raiseSecurityAlert({
            level: 'HIGH',
            type: 'INJECTION_ATTEMPT',
            details: {
              endpoint,
              violations,
              clientIp,
              userAgent: request.headers.get('user-agent')
            },
            timestamp: new Date(),
            requestId
          });

          // セキュリティモニターに記録
          await logSecurityEvent(
            request,
            violations.includes('SQL_INJECTION') ? 'SQL_INJECTION' : 'PATH_INJECTION',
            'HIGH',
            violations,
            { endpoint, clientIp }
          );
        } else if (violations.includes('XSS_DETECTED')) {
          await logSecurityEvent(request, 'XSS_ATTEMPT', 'MEDIUM', violations, { endpoint });
        } else {
          await logSecurityEvent(request, 'VALIDATION_ERROR', 'LOW', violations, { endpoint });
        }

        return {
          valid: false,
          violations,
          error: 'Security validation failed',
          code: violations[0],
          statusCode: 400,
          processingTime: Date.now() - startTime,
          requestId
        };
      }

      return {
        valid: true,
        violations: [],
        processingTime: Date.now() - startTime,
        requestId
      };

    } catch (error) {
      if (error instanceof ValidationError) {
        violations.push(error.code);
        this.recordViolation(this.getClientIp(request));

        return {
          valid: false,
          violations,
          error: error.message,
          code: error.code,
          statusCode: error.statusCode,
          processingTime: Date.now() - startTime,
          requestId
        };
      }

      // 予期しないエラー
      console.error('Security middleware error:', error);
      return {
        valid: false,
        violations: ['INTERNAL_ERROR'],
        error: 'Security validation error',
        code: 'SECURITY_ERROR',
        statusCode: 500,
        processingTime: Date.now() - startTime,
        requestId
      };
    }
  }

  /**
   * URLパラメータの検証
   */
  private static async validateUrlParameters(searchParams: URLSearchParams): Promise<string[]> {
    const violations: string[] = [];

    try {
      // fiscal_year検証
      const fiscalYear = searchParams.get('fiscal_year');
      if (fiscalYear) {
        SecureInputValidator.validateFiscalYear(fiscalYear);
      }

      // name_filter検証
      const nameFilter = searchParams.get('name_filter');
      if (nameFilter) {
        SecureInputValidator.validateSearchQuery(nameFilter);
      }

      // cursor検証
      const cursor = searchParams.get('cursor');
      if (cursor) {
        SecureInputValidator.validateCursor(cursor);
      }

      // limit検証
      const limit = searchParams.get('limit');
      if (limit) {
        SecureInputValidator.validateNumeric(limit, 1, 200, 50);
      }

      // company_id検証
      const companyId = searchParams.get('company_id');
      if (companyId) {
        SecureInputValidator.validateCompanyId(companyId);
      }

      // file_type検証
      const fileType = searchParams.get('file_type');
      if (fileType) {
        SecureInputValidator.validateFileType(fileType);
      }

    } catch (error) {
      if (error instanceof ValidationError) {
        violations.push(error.code);
      }
    }

    return violations;
  }

  /**
   * JSONペイロードの検証
   */
  private static async validateJsonPayload(body: any): Promise<string[]> {
    const violations: string[] = [];

    try {
      // ペイロードサイズチェック（1MB制限）
      const bodySize = JSON.stringify(body).length;
      if (bodySize > 1048576) {
        violations.push('PAYLOAD_TOO_LARGE');
        return violations;
      }

      // ネストレベルチェック（深さ10まで）
      if (this.getObjectDepth(body) > 10) {
        violations.push('EXCESSIVE_NESTING');
        return violations;
      }

      // バッチパラメータ検証
      const validated = SecureInputValidator.validateBatchParameters(body);

      // プロトタイプ汚染チェック
      if (this.hasPrototypePollution(body)) {
        violations.push('PROTOTYPE_POLLUTION');
      }

    } catch (error) {
      if (error instanceof ValidationError) {
        violations.push(error.code);
      }
    }

    return violations;
  }

  /**
   * エンドポイント固有の検証
   */
  private static async validateEndpointSpecific(request: NextRequest, endpoint: string): Promise<string[]> {
    const violations: string[] = [];

    // /api/v1/companies特有の検証
    if (endpoint === '/api/v1/companies') {
      // 特定の組み合わせの検証
      const searchParams = request.nextUrl.searchParams;
      const hasFiscalYear = searchParams.has('fiscal_year');
      const hasNameFilter = searchParams.has('name_filter');
      const hasLimit = searchParams.has('limit');

      // 不審なパラメータ組み合わせ
      if (hasFiscalYear && hasNameFilter && !hasLimit) {
        // 大量データ取得の試み
        violations.push('SUSPICIOUS_PARAMETER_COMBINATION');
      }
    }

    // /api/v1/documents特有の検証
    if (endpoint === '/api/v1/documents') {
      const searchParams = request.nextUrl.searchParams;
      const documentId = searchParams.get('document_id');

      if (documentId && documentId.length > 100) {
        violations.push('DOCUMENT_ID_TOO_LONG');
      }
    }

    return violations;
  }

  /**
   * オブジェクトの深さを取得
   */
  private static getObjectDepth(obj: any, currentDepth: number = 0): number {
    if (currentDepth > 15) return currentDepth; // 無限ループ防止

    if (obj === null || typeof obj !== 'object') {
      return currentDepth;
    }

    let maxDepth = currentDepth;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const depth = this.getObjectDepth(obj[key], currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    return maxDepth;
  }

  /**
   * プロトタイプ汚染の検出
   */
  private static hasPrototypePollution(obj: any): boolean {
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    const objStr = JSON.stringify(obj);

    for (const key of dangerousKeys) {
      if (objStr.includes(`"${key}"`)) {
        return true;
      }
    }

    return false;
  }

  /**
   * クライアントIPの取得
   */
  private static getClientIp(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
           request.headers.get('x-real-ip') ||
           request.headers.get('cf-connecting-ip') ||
           request.ip ||
           'unknown';
  }

  /**
   * 違反の記録
   */
  private static recordViolation(ip: string): void {
    const now = Date.now();
    const record = this.violationStore.get(ip);

    if (!record || now - record.firstViolation > this.RATE_LIMIT_WINDOW) {
      // 新しいウィンドウ
      this.violationStore.set(ip, {
        count: 1,
        firstViolation: now
      });
    } else {
      // 既存ウィンドウ内
      record.count++;
    }

    // 古いエントリのクリーンアップ
    this.cleanupViolationStore();
  }

  /**
   * 過度な違反のチェック
   */
  private static hasExcessiveViolations(ip: string): boolean {
    const record = this.violationStore.get(ip);
    if (!record) return false;

    const now = Date.now();
    if (now - record.firstViolation > this.RATE_LIMIT_WINDOW) {
      return false;
    }

    return record.count >= this.MAX_VIOLATIONS_PER_IP;
  }

  /**
   * 違反ストアのクリーンアップ
   */
  private static cleanupViolationStore(): void {
    const now = Date.now();
    const cutoff = now - this.RATE_LIMIT_WINDOW * 2;

    for (const [ip, record] of this.violationStore.entries()) {
      if (record.firstViolation < cutoff) {
        this.violationStore.delete(ip);
      }
    }
  }

  /**
   * セキュリティアラートの発行
   */
  private static async raiseSecurityAlert(alert: SecurityAlert): Promise<void> {
    console.warn('🚨 SECURITY ALERT:', {
      level: alert.level,
      type: alert.type,
      requestId: alert.requestId,
      timestamp: alert.timestamp.toISOString(),
      details: alert.details
    });

    // 本番環境では外部通知サービスに送信
    if (process.env.NODE_ENV === 'production') {
      // TODO: Webhook、メール、Slack等への通知
      // await this.sendToSecurityMonitoring(alert);
    }
  }

  /**
   * セキュリティヘッダーの追加
   */
  static addSecurityHeaders(response: NextResponse): void {
    // 基本的なセキュリティヘッダー
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY'); // nosemgrep: javascript.express.security.x-frame-options-misconfiguration
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Strict Transport Security（HTTPS環境のみ）
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://wpwqxhyiglbtlaimrjrx.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');

    response.headers.set('Content-Security-Policy', csp);
  }
}

/**
 * セキュリティミドルウェアのNext.js統合
 */
export function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const endpoint = request.nextUrl.pathname;

    // セキュリティ検証
    const validation = await SecurityMiddleware.validateRequest(request, endpoint);

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.error || 'Security validation failed',
          code: validation.code,
          violations: validation.violations,
          requestId: validation.requestId
        },
        {
          status: validation.statusCode || 400,
          headers: {
            'X-Security-Violation': validation.violations.join(','),
            'X-Request-ID': validation.requestId
          }
        }
      );
    }

    // ハンドラー実行
    const response = await handler(request);

    // セキュリティヘッダー追加
    SecurityMiddleware.addSecurityHeaders(response);
    response.headers.set('X-Request-ID', validation.requestId);
    response.headers.set('X-Security-Status', 'VALIDATED');

    return response;
  };
}