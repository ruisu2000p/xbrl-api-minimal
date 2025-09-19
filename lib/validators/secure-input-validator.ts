/**
 * Secure Input Validation System
 * GitHub Security Alert #86 Protection
 * Prevents XSS, SQL Injection, and validation bypass attacks
 */

export class SecureInputValidator {
  /**
   * 安全な数値検証
   */
  static validateNumericInput(
    value: string | null,
    min: number = 1,
    max: number = 200,
    defaultValue: number = 50
  ): number {
    if (!value) return defaultValue;

    const parsed = parseInt(value, 10);

    if (isNaN(parsed)) {
      throw new ValidationError(`Invalid numeric value: ${value}`);
    }

    if (parsed < min || parsed > max) {
      throw new ValidationError(`Value out of range: ${parsed} (must be ${min}-${max})`);
    }

    return parsed;
  }

  /**
   * XSS対策済み文字列サニタイゼーション
   */
  static sanitizeTextInput(value: string | null, maxLength: number = 100): string {
    if (!value) return '';

    // HTMLエスケープ（XSS防止）
    let sanitized = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/\\/g, '&#x5C;');

    // SQLインジェクション対策
    sanitized = sanitized.replace(/[;()--]/g, '');

    // 制御文字除去
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // 長さ制限
    return sanitized.slice(0, maxLength);
  }

  /**
   * 会計年度形式検証
   */
  static validateFiscalYear(value: string | null): string | null {
    if (!value) return null;

    const pattern = /^FY(20[0-9]{2})$/;
    if (!pattern.test(value)) {
      throw new ValidationError(`Invalid fiscal year format: ${value}`);
    }

    const year = parseInt(value.substring(2));
    const currentYear = new Date().getFullYear();

    if (year < 2010 || year > currentYear + 2) {
      throw new ValidationError(`Fiscal year out of valid range: ${year}`);
    }

    return value;
  }

  /**
   * 企業ID検証
   */
  static validateCompanyId(value: string): boolean {
    if (!value) return false;

    // 英数字とハイフンのみ、1-20文字
    const pattern = /^[A-Z0-9\-]{1,20}$/;
    return pattern.test(value);
  }

  /**
   * カーソル値の安全性検証
   */
  static validateCursor(value: string | null): string | null {
    if (!value) return null;

    // Base64形式のカーソル値を想定
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Pattern.test(value)) {
      throw new ValidationError('Invalid cursor format');
    }

    // 長さ制限（100文字まで）
    if (value.length > 100) {
      throw new ValidationError('Cursor value too long');
    }

    return value;
  }

  /**
   * ティッカーコード検証
   */
  static validateTickerCode(value: string | null): string | null {
    if (!value) return null;

    // 4桁の数字のみ許可
    const pattern = /^\d{4}$/;
    if (!pattern.test(value)) {
      throw new ValidationError(`Invalid ticker code: ${value}`);
    }

    return value;
  }

  /**
   * ドキュメントタイプ検証
   */
  static validateDocumentType(value: string | null): string | null {
    if (!value) return null;

    const allowedTypes = ['PublicDoc', 'PublicDoc_markdown', 'AuditDoc', 'all'];

    if (!allowedTypes.includes(value)) {
      throw new ValidationError(`Invalid document type: ${value}`);
    }

    return value;
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}