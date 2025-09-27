/**
 * Secure Input Validator
 * GitHub Security Alert #14 - Path Injection脆弱性対策
 */

import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

export class SecureInputValidator {
  // パス注入攻撃防御パターン
  private static readonly PATH_INJECTION_PATTERNS = [
    /\.\./,                                          // Directory traversal
    /\.\.%2f/i,                                     // URL encoded traversal
    /\.\.%252f/i,                                   // Double URL encoded
    /\.\.%c0%af/i,                                  // UTF-8 overlong encoding
    /\.\.%c1%1c/i,                                  // Alternative encoding
    /[\/\\]/,                                       // Path separators
    /\0/,                                           // Null byte injection
    /[\x00-\x1f\x7f]/,                             // Control characters
    /[<>:"|*?]/,                                    // Invalid filename chars
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,      // Windows reserved names
    /\$\{.*\}/,                                     // Template injection
    /%00/,                                          // URL encoded null
    /\.\.[;|&]/,                                    // Command injection
  ];

  // SQL注入攻撃防御パターン
  private static readonly SQL_INJECTION_PATTERNS = [
    /('|(\\')|(;)|(\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\s+))/i,
    /(UNION\s+SELECT)|(\s+OR\s+)|(\s+AND\s+)/i,
    /(-{2})|(\/\*)|(\*\/)/,                        // SQL comments
    /(xp_|sp_|0x[0-9a-f]+)/i,                      // Extended procedures & hex
    /(\|\||&&)/,                                    // Logical operators
    /(CAST|CONVERT|CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\(/i,
    /(WAITFOR|DELAY|BENCHMARK|SLEEP)/i,            // Time-based attacks
    /(INTO\s+(OUTFILE|DUMPFILE))/i,               // File operations
  ];

  // XSS攻撃パターン
  private static readonly XSS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<applet/i,
    /data:text\/html/i,
    /vbscript:/i,
  ];

  /**
   * パスパラメータの検証
   */
  static validatePathParameter(input: string | null): string | null {
    if (!input) return null;

    // 長さ制限
    if (input.length > 100) {
      throw new ValidationError('Parameter too long', 'PATH_TOO_LONG', 400);
    }

    // パス注入パターンチェック
    for (const pattern of this.PATH_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        console.error(`Path injection detected: ${input} matches ${pattern}`);
        throw new ValidationError('Invalid path characters detected', 'PATH_INJECTION', 400);
      }
    }

    // 絶対パスのブロック
    if (input.startsWith('/') || input.match(/^[a-zA-Z]:[\\\/]/)) {
      throw new ValidationError('Absolute paths are not allowed', 'ABSOLUTE_PATH', 400);
    }

    // UNCパスのブロック
    if (input.startsWith('\\\\') || input.startsWith('//')) {
      throw new ValidationError('UNC paths are not allowed', 'UNC_PATH', 400);
    }

    // URLのブロック
    if (input.match(/^(http|https|ftp|file):/i)) {
      throw new ValidationError('URLs are not allowed', 'URL_IN_PATH', 400);
    }

    // 英数字、ハイフン、アンダースコアのみ許可
    const sanitized = input.replace(/[^a-zA-Z0-9\-_]/g, '');

    if (sanitized.length === 0) {
      throw new ValidationError('Invalid parameter after sanitization', 'INVALID_SANITIZED', 400);
    }

    return sanitized;
  }

  /**
   * 検索クエリの検証
   */
  static validateSearchQuery(input: string | null): string | null {
    if (!input) return null;

    // 長さ制限
    if (input.length > 200) {
      throw new ValidationError('Search query too long', 'QUERY_TOO_LONG', 400);
    }

    // SQL注入パターンチェック
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        console.error(`SQL injection detected: ${input} matches ${pattern}`);
        throw new ValidationError('Malicious query pattern detected', 'SQL_INJECTION', 400);
      }
    }

    // XSSパターンチェック
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(input)) {
        console.error(`XSS pattern detected: ${input} matches ${pattern}`);
        throw new ValidationError('XSS pattern detected', 'XSS_DETECTED', 400);
      }
    }

    // HTMLサニタイゼーション
    const sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });

    // 制御文字の除去
    const cleaned = sanitized.replace(/[\x00-\x1f\x7f]/g, '');

    return cleaned.substring(0, 200);
  }

  /**
   * 年度パラメータ専用検証
   */
  static validateFiscalYear(input: string | null): string | null {
    if (!input) return null;

    // フォーマット検証
    const yearPattern = /^(20[0-9]{2}|FY20[0-9]{2})$/;
    if (!yearPattern.test(input)) {
      throw new ValidationError('Invalid fiscal year format', 'INVALID_FISCAL_YEAR', 400);
    }

    // 年度範囲チェック
    const yearStr = input.replace('FY', '');
    const year = parseInt(yearStr, 10);
    const currentYear = new Date().getFullYear();

    if (year < 2010 || year > currentYear + 1) {
      throw new ValidationError('Fiscal year out of range', 'FISCAL_YEAR_RANGE', 400);
    }

    return input;
  }

  /**
   * カーソルベースページング検証
   */
  static validateCursor(input: string | null): string | null {
    if (!input) return null;

    // 長さ制限
    if (input.length > 500) {
      throw new ValidationError('Cursor too long', 'CURSOR_TOO_LONG', 400);
    }

    // Base64パターン検証
    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Pattern.test(input)) {
      throw new ValidationError('Invalid cursor format', 'INVALID_CURSOR', 400);
    }

    // Base64デコード試行
    try {
      const decoded = Buffer.from(input, 'base64').toString('utf-8');

      // デコード後の内容検証
      if (decoded.includes('..') || decoded.includes('/') || decoded.includes('\\')) {
        throw new ValidationError('Malicious cursor content', 'MALICIOUS_CURSOR', 400);
      }
    } catch (error) {
      throw new ValidationError('Invalid cursor encoding', 'CURSOR_DECODE_ERROR', 400);
    }

    return input;
  }

  /**
   * 数値パラメータの検証
   */
  static validateNumeric(input: string | null, min: number, max: number, defaultValue: number): number {
    if (!input) return defaultValue;

    const parsed = parseInt(input, 10);

    if (isNaN(parsed)) {
      throw new ValidationError('Invalid numeric value', 'INVALID_NUMBER', 400);
    }

    if (parsed < min || parsed > max) {
      throw new ValidationError(`Value out of range (${min}-${max})`, 'NUMBER_OUT_OF_RANGE', 400);
    }

    return parsed;
  }

  /**
   * ファイルタイプの検証
   */
  static validateFileType(input: string | null): string | null {
    if (!input) return null;

    // 許可されたファイルタイプのみ
    const allowedTypes = [
      'PublicDoc',
      'PublicDoc_markdown',
      'AuditDoc',
      'AuditDoc_markdown'
    ];

    if (!allowedTypes.includes(input)) {
      throw new ValidationError('Invalid file type', 'INVALID_FILE_TYPE', 400);
    }

    return input;
  }

  /**
   * 企業IDの検証
   */
  static validateCompanyId(input: string | null): string | null {
    if (!input) return null;

    // フォーマット検証（英数字とハイフンのみ、8-20文字）
    const idPattern = /^[A-Z0-9\-]{8,20}$/;
    if (!idPattern.test(input)) {
      throw new ValidationError('Invalid company ID format', 'INVALID_COMPANY_ID', 400);
    }

    return input;
  }

  /**
   * バッチパラメータの検証
   */
  static validateBatchParameters(params: Record<string, any>): Record<string, any> {
    const validated: Record<string, any> = {};

    // 各パラメータを適切なバリデーターで検証
    if ('fiscal_year' in params) {
      validated.fiscal_year = this.validateFiscalYear(params.fiscal_year);
    }

    if ('company_name_filter' in params || 'name_filter' in params) {
      const nameFilter = params.company_name_filter || params.name_filter;
      validated.name_filter = this.validateSearchQuery(nameFilter);
    }

    if ('file_type' in params) {
      validated.file_type = this.validateFileType(params.file_type);
    }

    if ('cursor' in params) {
      validated.cursor = this.validateCursor(params.cursor);
    }

    if ('limit' in params) {
      validated.limit = this.validateNumeric(params.limit, 1, 200, 50);
    }

    if ('offset' in params) {
      validated.offset = this.validateNumeric(params.offset, 0, 10000, 0);
    }

    if ('company_id' in params) {
      validated.company_id = this.validateCompanyId(params.company_id);
    }

    return validated;
  }

  /**
   * HTTPヘッダーの検証
   */
  static validateHeaders(headers: Headers): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // User-Agent分析
    const userAgent = headers.get('user-agent');
    if (userAgent) {
      const suspiciousAgents = [
        /sqlmap/i,
        /nikto/i,
        /nmap/i,
        /burp/i,
        /acunetix/i,
        /nessus/i,
        /metasploit/i,
        /w3af/i,
        /havij/i,
        /owasp/i
      ];

      for (const pattern of suspiciousAgents) {
        if (pattern.test(userAgent)) {
          violations.push('SUSPICIOUS_USER_AGENT');
          break;
        }
      }
    }

    // Referer検証
    const referer = headers.get('referer');
    if (referer) {
      if (referer.includes('javascript:') || referer.includes('data:')) {
        violations.push('MALICIOUS_REFERER');
      }
    }

    // Origin検証
    const origin = headers.get('origin');
    if (origin && origin.includes('file://')) {
      violations.push('FILE_PROTOCOL_ORIGIN');
    }

    // X-Forwarded-For検証（プライベートIPチェック）
    const xForwardedFor = headers.get('x-forwarded-for');
    if (xForwardedFor) {
      const privateIpPattern = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/;
      if (privateIpPattern.test(xForwardedFor)) {
        violations.push('PRIVATE_IP_FORWARD');
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }
}

/**
 * Zod スキーマ定義
 */
export const CompanyQuerySchema = z.object({
  fiscal_year: z.string().regex(/^(20[0-9]{2}|FY20[0-9]{2})$/).optional(),
  name_filter: z.string().max(200).optional(),
  file_type: z.enum(['PublicDoc', 'PublicDoc_markdown', 'AuditDoc', 'AuditDoc_markdown']).optional(),
  cursor: z.string().max(500).optional(),
  limit: z.number().min(1).max(200).default(50),
  offset: z.number().min(0).max(10000).default(0),
  company_id: z.string().regex(/^[A-Z0-9\-]{8,20}$/).optional()
});

export type CompanyQueryParams = z.infer<typeof CompanyQuerySchema>;

/**
 * カスタムエラークラス
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
