/**
 * Unified Input Validation System
 * 統合された入力検証システム
 * すべてのAPIルートで一貫した検証を提供
 */

import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

export class UnifiedInputValidator {
  // パス注入攻撃防御パターン（lib/security/input-validator.tsから統合）
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
    /-{2,}/,                                        // SQL comments
    /\/\*.*\*\//,                                  // Block comments
    /xp_cmdshell/i,                                // SQL Server command execution
    /WAITFOR\s+DELAY/i,                           // Time-based injection
  ];

  // XSS攻撃防御パターン
  private static readonly XSS_PATTERNS = [
    /<script[^>]*>/gi,
    /<iframe[^>]*>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,                                 // Event handlers
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi,
    /data:text\/html/gi,
  ];

  // 許可された文字パターン
  private static readonly ALLOWED_PATTERNS = {
    alphanumeric: /^[a-zA-Z0-9]+$/,
    alphanumeric_space: /^[a-zA-Z0-9\s]+$/,
    alphanumeric_japanese: /^[a-zA-Z0-9\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]+$/,
    filename: /^[a-zA-Z0-9._-]+$/,
    company_id: /^[A-Z0-9]{8}$/,
    fiscal_year: /^FY\d{4}$/,
    api_key: /^xbrl_v\d+_[a-f0-9]{32,64}$/,
  };

  /**
   * 汎用的な文字列検証
   */
  static validateString(
    value: string | null | undefined,
    options: {
      maxLength?: number;
      pattern?: RegExp;
      allowEmpty?: boolean;
      trim?: boolean;
    } = {}
  ): string {
    const {
      maxLength = 1000,
      pattern,
      allowEmpty = false,
      trim = true
    } = options;

    if (value === null || value === undefined) {
      if (allowEmpty) return '';
      throw new Error('値が必須です');
    }

    let validated = String(value);

    if (trim) {
      validated = validated.trim();
    }

    if (!allowEmpty && validated.length === 0) {
      throw new Error('空の値は許可されていません');
    }

    if (validated.length > maxLength) {
      throw new Error(`最大長 ${maxLength} を超えています`);
    }

    // XSS攻撃パターンをチェック
    for (const xssPattern of this.XSS_PATTERNS) {
      if (xssPattern.test(validated)) {
        throw new Error('潜在的なXSS攻撃を検出しました');
      }
    }

    // SQL注入攻撃パターンをチェック
    for (const sqlPattern of this.SQL_INJECTION_PATTERNS) {
      if (sqlPattern.test(validated)) {
        throw new Error('潜在的なSQL注入攻撃を検出しました');
      }
    }

    // カスタムパターンのチェック
    if (pattern && !pattern.test(validated)) {
      throw new Error('無効な形式です');
    }

    return validated;
  }

  /**
   * 数値検証（lib/validators/secure-input-validator.tsから統合）
   */
  static validateNumericInput(
    value: string | number | null | undefined,
    options: {
      min?: number;
      max?: number;
      defaultValue?: number;
      allowNull?: boolean;
    } = {}
  ): number | null {
    const {
      min = 1,
      max = Number.MAX_SAFE_INTEGER,
      defaultValue,
      allowNull = false
    } = options;

    if (value === null || value === undefined) {
      if (allowNull) return null;
      if (defaultValue !== undefined) return defaultValue;
      throw new Error('数値が必須です');
    }

    const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);

    if (isNaN(parsed)) {
      throw new Error(`無効な数値: ${value}`);
    }

    if (parsed < min || parsed > max) {
      throw new Error(`範囲外の値: ${parsed} (${min}-${max}の範囲内である必要があります)`);
    }

    return parsed;
  }

  /**
   * パス検証
   */
  static validatePath(path: string | null | undefined): string {
    const validated = this.validateString(path, {
      maxLength: 500,
      allowEmpty: false
    });

    for (const pattern of this.PATH_INJECTION_PATTERNS) {
      if (pattern.test(validated)) {
        throw new Error('無効なパス文字が含まれています');
      }
    }

    return validated;
  }

  /**
   * Company ID検証
   */
  static validateCompanyId(companyId: string | null | undefined): string {
    return this.validateString(companyId, {
      maxLength: 20,
      pattern: this.ALLOWED_PATTERNS.company_id
    });
  }

  /**
   * Fiscal Year検証
   */
  static validateFiscalYear(fiscalYear: string | null | undefined): string {
    return this.validateString(fiscalYear, {
      maxLength: 10,
      pattern: this.ALLOWED_PATTERNS.fiscal_year
    });
  }

  /**
   * APIキー形式検証
   */
  static validateApiKeyFormat(apiKey: string | null | undefined): string {
    return this.validateString(apiKey, {
      maxLength: 100,
      pattern: this.ALLOWED_PATTERNS.api_key
    });
  }

  /**
   * 検索クエリ検証
   */
  static validateSearchQuery(query: string | null | undefined): string {
    const validated = this.validateString(query, {
      maxLength: 200,
      allowEmpty: true,
      trim: true
    });

    // HTMLをサニタイズ
    return DOMPurify.sanitize(validated, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }

  /**
   * ページネーションパラメータ検証
   */
  static validatePagination(params: {
    page?: string | number | null;
    limit?: string | number | null;
  }): {
    page: number;
    limit: number;
    offset: number;
  } {
    const page = this.validateNumericInput(params.page, {
      min: 1,
      max: 10000,
      defaultValue: 1
    }) as number;

    const limit = this.validateNumericInput(params.limit, {
      min: 1,
      max: 200,
      defaultValue: 50
    }) as number;

    return {
      page,
      limit,
      offset: (page - 1) * limit
    };
  }

  /**
   * 日付範囲検証
   */
  static validateDateRange(params: {
    startDate?: string | null;
    endDate?: string | null;
  }): {
    startDate: string | null;
    endDate: string | null;
  } {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    let startDate: string | null = null;
    let endDate: string | null = null;

    if (params.startDate) {
      startDate = this.validateString(params.startDate, {
        pattern: datePattern,
        maxLength: 10
      });
    }

    if (params.endDate) {
      endDate = this.validateString(params.endDate, {
        pattern: datePattern,
        maxLength: 10
      });
    }

    // 日付の妥当性チェック
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        throw new Error('開始日は終了日より前である必要があります');
      }

      // 最大1年の範囲
      const maxRange = 365 * 24 * 60 * 60 * 1000; // 1年のミリ秒
      if (end.getTime() - start.getTime() > maxRange) {
        throw new Error('日付範囲は最大1年です');
      }
    }

    return { startDate, endDate };
  }

  /**
   * バッチ検証
   * 複数の入力を一度に検証
   */
  static validateBatch<T extends Record<string, any>>(
    data: T,
    schema: Record<keyof T, (value: any) => any>
  ): Record<keyof T, any> {
    const validated: Record<string, any> = {};
    const errors: string[] = [];

    for (const [key, validator] of Object.entries(schema)) {
      try {
        validated[key] = validator(data[key]);
      } catch (error) {
        errors.push(`${key}: ${error instanceof Error ? error.message : '検証エラー'}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`検証エラー:\n${errors.join('\n')}`);
    }

    return validated as Record<keyof T, any>;
  }
}

// エクスポート
export default UnifiedInputValidator;