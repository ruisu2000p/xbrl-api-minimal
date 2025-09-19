/**
 * SQL/NoSQL Injection Protection System
 * Comprehensive protection against injection attacks
 */

export class SQLInjectionShield {
  private static readonly DANGEROUS_SQL_PATTERNS = [
    // 基本的なSQLキーワード
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE)\b/gi,
    // 条件式ベースの攻撃
    /(\b(OR|AND)\s+[\d\w\s]*\s*[=<>!]+\s*[\d\w\s]*)/gi,
    // コメント注入
    /(--|\/\*|\*\/|#)/g,
    // 特殊文字による攻撃
    /[;'"\\%_]/g,
    // 関数呼び出し
    /\b(EXEC|EXECUTE|sp_|xp_)\b/gi,
    // 文字列連結攻撃
    /(\+\s*['"][^'"]*['"]|\|\|)/g
  ];

  private static readonly SUSPICIOUS_NOSQL_PATTERNS = [
    // MongoDB NoSQL Injection
    /(\$where|\$ne|\$gt|\$lt|\$regex|\$exists)/gi,
    // JavaScript injection
    /\b(function|eval|setTimeout|setInterval)\s*\(/gi,
    // Object prototype pollution
    /(__proto__|constructor|prototype)/gi
  ];

  /**
   * 包括的なインジェクション検証
   */
  static validateInput(input: string, context: 'query' | 'filter' | 'sort' = 'query'): ValidationResult {
    if (!input) return { valid: true, sanitized: '' };

    // SQL注入パターン検証
    const sqlResult = this.detectSQLInjection(input);
    if (!sqlResult.valid) {
      return sqlResult;
    }

    // NoSQL注入パターン検証
    const nosqlResult = this.detectNoSQLInjection(input);
    if (!nosqlResult.valid) {
      return nosqlResult;
    }

    // コンテキスト固有の検証
    const contextResult = this.validateByContext(input, context);
    if (!contextResult.valid) {
      return contextResult;
    }

    return {
      valid: true,
      sanitized: this.sanitizeInput(input, context)
    };
  }

  private static detectSQLInjection(input: string): ValidationResult {
    for (const pattern of this.DANGEROUS_SQL_PATTERNS) {
      if (pattern.test(input)) {
        return {
          valid: false,
          reason: 'SQL_INJECTION_DETECTED',
          pattern: pattern.source
        };
      }
    }
    return { valid: true };
  }

  private static detectNoSQLInjection(input: string): ValidationResult {
    for (const pattern of this.SUSPICIOUS_NOSQL_PATTERNS) {
      if (pattern.test(input)) {
        return {
          valid: false,
          reason: 'NOSQL_INJECTION_DETECTED',
          pattern: pattern.source
        };
      }
    }
    return { valid: true };
  }

  private static validateByContext(input: string, context: string): ValidationResult {
    switch (context) {
      case 'query':
        return this.validateQueryInput(input);
      case 'filter':
        return this.validateFilterInput(input);
      case 'sort':
        return this.validateSortInput(input);
      default:
        return { valid: true };
    }
  }

  private static validateQueryInput(input: string): ValidationResult {
    // クエリパラメータは英数字、ハイフン、アンダースコア、日本語文字のみ許可
    const allowedPattern = /^[a-zA-Z0-9\-_\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]*$/;

    if (!allowedPattern.test(input)) {
      return {
        valid: false,
        reason: 'INVALID_QUERY_CHARACTERS'
      };
    }

    return { valid: true };
  }

  private static validateFilterInput(input: string): ValidationResult {
    // フィルター値は更に制限的
    const allowedPattern = /^[a-zA-Z0-9\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]*$/;

    if (!allowedPattern.test(input) || input.length > 50) {
      return {
        valid: false,
        reason: 'INVALID_FILTER_INPUT'
      };
    }

    return { valid: true };
  }

  private static validateSortInput(input: string): ValidationResult {
    // ソート条件は予め定義されたもののみ許可
    const allowedSortFields = ['name', 'date', 'size', 'type', 'created_at', 'updated_at', 'company_name', 'fiscal_year'];
    const allowedDirections = ['asc', 'desc'];

    const sortPattern = /^(\w+)\s*(asc|desc)?$/i;
    const match = input.match(sortPattern);

    if (!match) {
      return {
        valid: false,
        reason: 'INVALID_SORT_FORMAT'
      };
    }

    const [, field, direction = 'asc'] = match;

    if (!allowedSortFields.includes(field.toLowerCase()) ||
        !allowedDirections.includes(direction.toLowerCase())) {
      return {
        valid: false,
        reason: 'INVALID_SORT_PARAMETERS'
      };
    }

    return { valid: true };
  }

  private static sanitizeInput(input: string, context: string): string {
    // 基本的なサニタイゼーション
    let sanitized = input
      .replace(/\s+/g, ' ')  // 複数空白を単一空白に
      .trim()                // 前後の空白除去
      .slice(0, 255);        // 長さ制限

    // コンテキスト別の追加サニタイゼーション
    switch (context) {
      case 'filter':
        sanitized = sanitized.slice(0, 50);  // フィルターは50文字制限
        break;
      case 'sort':
        sanitized = sanitized.toLowerCase(); // ソートは小文字統一
        break;
    }

    return sanitized;
  }

  /**
   * Supabase RPC呼び出し用パラメータのサニタイゼーション
   */
  static sanitizeRpcParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // 文字列パラメータのサニタイゼーション
        const result = this.validateInput(value, 'filter');
        if (!result.valid) {
          throw new Error(`Invalid parameter ${key}: ${result.reason}`);
        }
        sanitized[key] = result.sanitized;
      } else if (typeof value === 'number') {
        // 数値パラメータの検証
        if (!Number.isFinite(value)) {
          throw new Error(`Invalid numeric parameter ${key}`);
        }
        sanitized[key] = value;
      } else if (value === null || value === undefined) {
        sanitized[key] = null;
      } else if (typeof value === 'boolean') {
        sanitized[key] = value;
      } else {
        // その他の型は拒否
        throw new Error(`Invalid parameter type for ${key}`);
      }
    }

    return sanitized;
  }
}

interface ValidationResult {
  valid: boolean;
  sanitized?: string;
  reason?: string;
  pattern?: string;
}

export type { ValidationResult };