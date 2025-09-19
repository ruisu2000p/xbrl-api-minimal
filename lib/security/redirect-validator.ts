/**
 * Redirect URL Validator
 * GitHub Security Alert #13 - Open Redirect脆弱性対策
 * CWE-601: URL Redirection to Untrusted Site
 */

import { URL } from 'url';

export class RedirectValidator {
  // 許可されたドメインのホワイトリスト
  private static readonly ALLOWED_DOMAINS = [
    'localhost',
    '127.0.0.1',
    'xbrl-api-minimal.vercel.app',
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL
  ].filter(Boolean);

  // 許可されたパスのホワイトリスト
  private static readonly ALLOWED_PATHS = [
    '/dashboard',
    '/dashboard/settings',
    '/dashboard/api-keys',
    '/dashboard/usage',
    '/dashboard/billing',
    '/profile',
    '/auth/verify-email',
    '/auth/reset-password',
    '/auth/update-password',
    '/welcome',
    '/onboarding'
  ];

  // 危険なスキーマパターン
  private static readonly DANGEROUS_SCHEMAS = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'ftp:',
    'about:',
    'chrome:',
    'ms-',
    'res:',
    'resource:',
    'shell:',
    'webkit-',
    'moz-',
    'opera-',
    'safari-',
    'ie-'
  ];

  // 危険な文字パターン
  private static readonly DANGEROUS_PATTERNS = [
    /[\x00-\x1F\x7F]/g,  // 制御文字
    /[<>\"\']/g,         // HTMLエスケープが必要な文字
    /%00/gi,             // Null byte
    /%0d%0a/gi,          // CRLF injection
    /\r|\n/g             // 改行文字
  ];

  /**
   * リダイレクトURLの安全性を検証
   * @param redirectUrl 検証対象のURL
   * @param requestUrl 現在のリクエストURL（同一オリジン判定用）
   * @returns 安全性検証結果
   */
  static validateRedirectUrl(redirectUrl: string, requestUrl: string): ValidationResult {
    const startTime = Date.now();

    try {
      // 1. 基本的なURL形式検証
      if (!redirectUrl || typeof redirectUrl !== 'string') {
        return {
          isValid: false,
          error: 'Invalid redirect URL format',
          code: 'INVALID_FORMAT',
          processingTime: Date.now() - startTime
        };
      }

      // 2. 最大長制限（URLは2048文字まで）
      if (redirectUrl.length > 2048) {
        return {
          isValid: false,
          error: 'Redirect URL too long',
          code: 'URL_TOO_LONG',
          processingTime: Date.now() - startTime
        };
      }

      // 3. 制御文字と危険な文字の検出
      for (const pattern of this.DANGEROUS_PATTERNS) {
        if (pattern.test(redirectUrl)) {
          return {
            isValid: false,
            error: 'Dangerous characters detected in URL',
            code: 'DANGEROUS_CHARS',
            threat: 'CHARACTER_INJECTION',
            processingTime: Date.now() - startTime
          };
        }
      }

      // 4. 危険なスキーマの検出
      const lowerUrl = redirectUrl.toLowerCase().trim();
      for (const schema of this.DANGEROUS_SCHEMAS) {
        if (lowerUrl.startsWith(schema)) {
          return {
            isValid: false,
            error: `Dangerous URL schema detected: ${schema}`,
            code: 'DANGEROUS_SCHEMA',
            threat: 'XSS_RISK',
            processingTime: Date.now() - startTime
          };
        }
      }

      // 5. 相対URLの検証
      if (redirectUrl.startsWith('/')) {
        return this.validateRelativePath(redirectUrl, startTime);
      }

      // 6. プロトコル相対URLの検証
      if (redirectUrl.startsWith('//')) {
        return {
          isValid: false,
          error: 'Protocol-relative URLs are not allowed',
          code: 'PROTOCOL_RELATIVE_URL',
          threat: 'OPEN_REDIRECT',
          processingTime: Date.now() - startTime
        };
      }

      // 7. 絶対URLの検証
      if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
        return this.validateAbsoluteUrl(redirectUrl, requestUrl, startTime);
      }

      // 8. その他の形式は拒否
      return {
        isValid: false,
        error: 'Unsupported URL format',
        code: 'UNSUPPORTED_FORMAT',
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'URL validation failed',
        code: 'VALIDATION_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 相対パスの検証
   */
  private static validateRelativePath(path: string, startTime: number): ValidationResult {
    // パストラバーサル攻撃の検出
    if (path.includes('..') || path.includes('\\') || path.includes('%2e%2e') || path.includes('%5c')) {
      return {
        isValid: false,
        error: 'Path traversal detected in redirect URL',
        code: 'PATH_TRAVERSAL',
        threat: 'DIRECTORY_TRAVERSAL',
        processingTime: Date.now() - startTime
      };
    }

    // ダブルスラッシュの検出（//path は protocol-relative URL）
    if (path.includes('//')) {
      return {
        isValid: false,
        error: 'Double slashes detected in path',
        code: 'DOUBLE_SLASH',
        threat: 'URL_CONFUSION',
        processingTime: Date.now() - startTime
      };
    }

    // URLエンコード攻撃の検出
    const decodedPath = decodeURIComponent(path);
    if (decodedPath !== path && (decodedPath.includes('..') || decodedPath.includes('\\'))) {
      return {
        isValid: false,
        error: 'Encoded path traversal detected',
        code: 'ENCODED_PATH_TRAVERSAL',
        threat: 'DIRECTORY_TRAVERSAL',
        processingTime: Date.now() - startTime
      };
    }

    // 許可パスのチェック
    const pathWithoutQuery = path.split('?')[0].split('#')[0];
    const isAllowed = this.ALLOWED_PATHS.some(allowedPath =>
      pathWithoutQuery === allowedPath || pathWithoutQuery.startsWith(allowedPath + '/')
    );

    if (!isAllowed) {
      return {
        isValid: false,
        error: `Path not in allowed list: ${pathWithoutQuery}`,
        code: 'PATH_NOT_ALLOWED',
        processingTime: Date.now() - startTime
      };
    }

    return {
      isValid: true,
      sanitizedUrl: path,
      urlType: 'RELATIVE',
      processingTime: Date.now() - startTime
    };
  }

  /**
   * 絶対URLの検証
   */
  private static validateAbsoluteUrl(
    urlString: string,
    requestUrl: string,
    startTime: number
  ): ValidationResult {
    try {
      const url = new URL(urlString);
      const currentUrl = new URL(requestUrl);

      // プロトコル検証
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return {
          isValid: false,
          error: `Unsupported protocol: ${url.protocol}`,
          code: 'UNSUPPORTED_PROTOCOL',
          processingTime: Date.now() - startTime
        };
      }

      // HTTPS強制（本番環境）
      if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
        return {
          isValid: false,
          error: 'HTTPS required in production',
          code: 'HTTPS_REQUIRED',
          processingTime: Date.now() - startTime
        };
      }

      // ポート番号の検証
      const suspiciousPorts = ['22', '23', '25', '110', '143', '3389'];
      if (url.port && suspiciousPorts.includes(url.port)) {
        return {
          isValid: false,
          error: `Suspicious port detected: ${url.port}`,
          code: 'SUSPICIOUS_PORT',
          threat: 'PORT_SCANNING',
          processingTime: Date.now() - startTime
        };
      }

      // 認証情報の検出（username:password@domain）
      if (url.username || url.password) {
        return {
          isValid: false,
          error: 'URL contains authentication credentials',
          code: 'CREDENTIALS_IN_URL',
          threat: 'CREDENTIAL_LEAKAGE',
          processingTime: Date.now() - startTime
        };
      }

      // IPアドレスの検証（プライベートIPをブロック）
      if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(url.hostname)) {
        const octets = url.hostname.split('.').map(Number);
        const isPrivate = (
          (octets[0] === 10) ||
          (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
          (octets[0] === 192 && octets[1] === 168) ||
          (octets[0] === 127)
        );

        if (isPrivate) {
          return {
            isValid: false,
            error: 'Private IP addresses not allowed',
            code: 'PRIVATE_IP',
            threat: 'INTERNAL_NETWORK_ACCESS',
            processingTime: Date.now() - startTime
          };
        }
      }

      // ドメインホワイトリストチェック
      const isAllowedDomain = this.ALLOWED_DOMAINS.some(domain => {
        if (!domain) return false;
        return url.hostname === domain ||
               url.hostname.endsWith('.' + domain) ||
               (domain.startsWith('*.') && url.hostname.endsWith(domain.substring(1)));
      });

      if (!isAllowedDomain) {
        return {
          isValid: false,
          error: `Domain not in allowed list: ${url.hostname}`,
          code: 'DOMAIN_NOT_ALLOWED',
          threat: 'OPEN_REDIRECT',
          processingTime: Date.now() - startTime
        };
      }

      // 同一オリジンチェック（最も安全）
      const isSameOrigin = url.origin === currentUrl.origin;

      return {
        isValid: true,
        sanitizedUrl: url.toString(),
        urlType: isSameOrigin ? 'SAME_ORIGIN' : 'ALLOWED_EXTERNAL',
        hostname: url.hostname,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid absolute URL',
        code: 'INVALID_ABSOLUTE_URL',
        details: error instanceof Error ? error.message : 'URL parsing failed',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 安全なリダイレクトURLの生成
   */
  static generateSafeRedirectUrl(
    originalUrl: string | null,
    fallbackUrl: string = '/dashboard',
    requestUrl: string = 'https://xbrl-api-minimal.vercel.app'
  ): string {
    if (!originalUrl) {
      return fallbackUrl;
    }

    const validation = this.validateRedirectUrl(originalUrl, requestUrl);

    if (validation.isValid && validation.sanitizedUrl) {
      return validation.sanitizedUrl;
    }

    // 検証失敗時のログ
    console.warn('Redirect URL validation failed:', {
      originalUrl,
      code: validation.code,
      error: validation.error,
      fallback: fallbackUrl
    });

    return fallbackUrl;
  }

  /**
   * セキュリティ違反のログ記録
   */
  static logSecurityViolation(violation: SecurityViolation): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'REDIRECT_SECURITY_VIOLATION',
      ...violation,
      userAgent: violation.userAgent || 'Unknown',
      ipAddress: violation.ipAddress || 'Unknown'
    };

    // 本番環境では外部ログサービスに送信
    if (process.env.NODE_ENV === 'production') {
      // TODO: 外部ログサービスとの統合
      console.error('🚨 REDIRECT SECURITY VIOLATION:', logEntry);

      // Supabaseへのログ記録も検討
      // await supabaseManager.getServiceClient()
      //   .from('security_violations_log')
      //   .insert(logEntry);
    } else {
      console.warn('⚠️ Redirect Security Violation (Dev):', logEntry);
    }
  }

  /**
   * リダイレクトURLのサニタイゼーション
   */
  static sanitizeRedirectUrl(url: string): string {
    // HTMLエンティティのエスケープ
    return url
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  urlType?: 'RELATIVE' | 'SAME_ORIGIN' | 'ALLOWED_EXTERNAL';
  hostname?: string;
  error?: string;
  code?: string;
  threat?: string;
  details?: string;
  processingTime: number;
}

export interface SecurityViolation {
  originalUrl: string;
  error: string;
  code: string;
  threat?: string;
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
}