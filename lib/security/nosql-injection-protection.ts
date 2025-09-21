/**
 * NoSQL Injection Protection
 * GitHub Security Alert #78 - NoSQL/Supabaseインジェクション対策
 */

import { createHash } from 'crypto';

export class NoSQLInjectionProtection {
  // MongoDB演算子のブラックリスト
  private static readonly MONGODB_OPERATORS = [
    '$where', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin',
    '$regex', '$exists', '$type', '$mod', '$all', '$size', '$elemMatch',
    '$or', '$and', '$not', '$nor', '$text', '$search', '$geoWithin',
    '$geoIntersects', '$near', '$nearSphere', '$geometry', '$maxDistance',
    '$minDistance', '$polygon', '$center', '$centerSphere', '$box',
    '$expr', '$jsonSchema', '$comment', '$meta'
  ];

  // 危険な関数名のブラックリスト
  private static readonly DANGEROUS_FUNCTIONS = [
    'eval', 'Function', 'setTimeout', 'setInterval', 'exec',
    'execSync', 'spawn', 'spawnSync', '__proto__', 'constructor',
    'prototype', 'process', 'require', 'global', 'module'
  ];

  // 許可されたフィールド名（ホワイトリスト）
  private static readonly ALLOWED_FIELDS = [
    'company_id', 'company_name', 'fiscal_year', 'fiscal_period',
    'document_type', 'document_name', 'file_name', 'file_type',
    'file_size', 'storage_path', 'created_at', 'updated_at',
    'submit_date', 'doc_id', 'limit', 'offset', 'cursor',
    'sort', 'order', 'active', 'is_active', 'metadata'
  ];

  // 許可された並び順フィールド
  private static readonly ALLOWED_SORT_FIELDS = [
    'company_name', 'fiscal_year', 'created_at', 'updated_at',
    'submit_date', 'file_size', 'document_type'
  ];

  /**
   * Supabase クエリの安全な構築
   */
  static buildSafeQuery(
    baseQuery: any,
    filters: Record<string, any>
  ): any {
    let safeQuery = baseQuery;

    for (const [key, value] of Object.entries(filters)) {
      // null/undefinedはスキップ
      if (value === null || value === undefined) {
        continue;
      }

      const sanitizedKey = this.sanitizeFieldName(key);
      const sanitizedValue = this.sanitizeValue(value);

      if (!sanitizedKey || sanitizedValue === null) {
        console.warn(`Skipping unsafe filter: ${key}`);
        continue;
      }

      switch (sanitizedKey) {
        case 'company_name':
          // ILIKE 検索の安全な実装（部分一致）
          if (typeof sanitizedValue === 'string') {
            const escapedValue = this.escapePostgresPattern(sanitizedValue);
            safeQuery = safeQuery.ilike(sanitizedKey, `%${escapedValue}%`);
          }
          break;

        case 'fiscal_year':
        case 'document_type':
        case 'company_id':
          // 完全一致検索
          safeQuery = safeQuery.eq(sanitizedKey, sanitizedValue);
          break;

        case 'limit':
          // 数値制限（1-200）
          const limit = this.sanitizeNumeric(sanitizedValue, 1, 200);
          safeQuery = safeQuery.limit(limit);
          break;

        case 'offset':
          // オフセット（0-10000）
          const offset = this.sanitizeNumeric(sanitizedValue, 0, 10000);
          safeQuery = safeQuery.range(offset, offset + 200);
          break;

        case 'cursor':
          // カーソルベースのページネーション
          if (typeof sanitizedValue === 'string' && sanitizedValue.match(/^[a-zA-Z0-9_-]+$/)) {
            safeQuery = safeQuery.gt('id', sanitizedValue);
          }
          break;

        case 'sort':
          // ソート条件の安全な適用
          const sortConfig = this.parseSortParameter(sanitizedValue);
          if (sortConfig) {
            safeQuery = safeQuery.order(sortConfig.field, {
              ascending: sortConfig.ascending
            });
          }
          break;

        default:
          // その他のフィールドは完全一致のみ
          if (this.ALLOWED_FIELDS.includes(sanitizedKey)) {
            safeQuery = safeQuery.eq(sanitizedKey, sanitizedValue);
          }
      }
    }

    return safeQuery;
  }

  /**
   * MongoDB風のクエリオブジェクト検証
   */
  static validateQueryObject(query: any): boolean {
    if (query === null || query === undefined) {
      return true; // null/undefinedは安全
    }

    if (typeof query !== 'object') {
      return true; // プリミティブ値は安全
    }

    try {
      const queryString = JSON.stringify(query);

      // MongoDB演算子の検出
      for (const operator of this.MONGODB_OPERATORS) {
        if (queryString.includes(operator)) {
          console.error(`Detected MongoDB operator: ${operator}`);
          return false;
        }
      }

      // 危険な関数の検出
      for (const func of this.DANGEROUS_FUNCTIONS) {
        if (queryString.includes(func)) {
          console.error(`Detected dangerous function: ${func}`);
          return false;
        }
      }

      // プロトタイプ汚染の検出
      if (queryString.includes('__proto__') ||
          queryString.includes('constructor') ||
          queryString.includes('prototype')) {
        console.error('Detected prototype pollution attempt');
        return false;
      }

      // ネストしたオブジェクトの再帰検証
      return this.validateNestedObject(query);
    } catch (error) {
      console.error('Query validation error:', error);
      return false;
    }
  }

  /**
   * ネストしたオブジェクトの再帰検証
   */
  private static validateNestedObject(obj: any, depth: number = 0): boolean {
    // 深さ制限（DoS対策）
    if (depth > 10) {
      console.error('Object nesting too deep');
      return false;
    }

    for (const [key, value] of Object.entries(obj)) {
      // キー名の検証
      if (typeof key === 'string') {
        if (key.startsWith('$') || key.includes('.')) {
          console.error(`Suspicious key detected: ${key}`);
          return false;
        }
      }

      // 値の再帰検証
      if (value && typeof value === 'object') {
        if (!this.validateNestedObject(value, depth + 1)) {
          return false;
        }
      }

      // 関数の検出
      if (typeof value === 'function') {
        console.error('Function detected in query object');
        return false;
      }
    }

    return true;
  }

  /**
   * フィールド名のサニタイゼーション
   */
  private static sanitizeFieldName(fieldName: string): string | null {
    if (!fieldName || typeof fieldName !== 'string') {
      return null;
    }

    // 小文字に変換
    const normalized = fieldName.toLowerCase().trim();

    // 英数字とアンダースコアのみ許可
    const sanitized = normalized.replace(/[^a-z0-9_]/g, '');

    // 長さ制限
    if (sanitized.length === 0 || sanitized.length > 50) {
      return null;
    }

    // ホワイトリストチェック
    if (!this.ALLOWED_FIELDS.includes(sanitized)) {
      console.warn(`Field not in whitelist: ${sanitized}`);
      return null;
    }

    return sanitized;
  }

  /**
   * 値のサニタイゼーション
   */
  private static sanitizeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      // 文字列の安全化
      let sanitized = value
        .replace(/[\${}]/g, '') // MongoDB演算子文字除去
        .replace(/['"\\]/g, '') // クォート文字除去
        .trim();

      // 長さ制限
      if (sanitized.length > 255) {
        sanitized = sanitized.slice(0, 255);
      }

      // 制御文字の除去
      sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

      return sanitized;
    }

    if (typeof value === 'number') {
      // 数値の範囲制限
      if (!isFinite(value) || isNaN(value)) {
        return null;
      }
      return Math.max(-1000000, Math.min(1000000, value));
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      // 配列の要素を再帰的にサニタイズ（最大10要素）
      return value.slice(0, 10).map(item => this.sanitizeValue(item));
    }

    // その他の型は拒否
    return null;
  }

  /**
   * PostgreSQL LIKE パターンのエスケープ
   */
  private static escapePostgresPattern(pattern: string): string {
    return pattern
      .replace(/\\/g, '\\\\') // バックスラッシュをエスケープ
      .replace(/%/g, '\\%')   // パーセントをエスケープ
      .replace(/_/g, '\\_');   // アンダースコアをエスケープ
  }

  /**
   * 数値の安全な変換
   */
  private static sanitizeNumeric(
    value: any,
    min: number = Number.MIN_SAFE_INTEGER,
    max: number = Number.MAX_SAFE_INTEGER
  ): number {
    const num = parseInt(String(value), 10);

    if (isNaN(num) || !isFinite(num)) {
      return min;
    }

    return Math.max(min, Math.min(max, num));
  }

  /**
   * ソートパラメータの解析
   */
  private static parseSortParameter(value: any): { field: string; ascending: boolean } | null {
    if (!value || typeof value !== 'string') {
      return null;
    }

    const parts = value.toLowerCase().trim().split(/\s+/);
    if (parts.length === 0 || parts.length > 2) {
      return null;
    }

    const field = parts[0];
    const direction = parts[1] || 'asc';

    // フィールド名の検証
    if (!this.ALLOWED_SORT_FIELDS.includes(field)) {
      return null;
    }

    // 並び順の検証
    if (direction !== 'asc' && direction !== 'desc') {
      return null;
    }

    return {
      field: field,
      ascending: direction === 'asc'
    };
  }

  /**
   * RPC パラメータのサニタイゼーション
   */
  static sanitizeRpcParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      // キー名の検証
      const sanitizedKey = this.sanitizeFieldName(key);
      if (!sanitizedKey) {
        throw new NoSQLInjectionError(`Invalid parameter name: ${key}`);
      }

      // 値の型チェック
      if (value !== null && value !== undefined) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          throw new NoSQLInjectionError('Objects not allowed in RPC parameters');
        }

        if (typeof value === 'function') {
          throw new NoSQLInjectionError('Functions not allowed in RPC parameters');
        }
      }

      // 値のサニタイゼーション
      const sanitizedValue = this.sanitizeValue(value);
      if (sanitizedValue !== null) {
        sanitized[sanitizedKey] = sanitizedValue;
      }
    }

    return sanitized;
  }

  /**
   * JSON パスのサニタイゼーション
   */
  static sanitizeJSONPath(path: string): string | null {
    if (!path || typeof path !== 'string') {
      return null;
    }

    // JSONパスの基本検証
    const validPath = /^[\w\.\[\]]+$/;
    if (!validPath.test(path)) {
      return null;
    }

    // 危険なパターンのチェック
    if (path.includes('..') || path.includes('//')) {
      return null;
    }

    // 長さ制限
    if (path.length > 100) {
      return null;
    }

    return path;
  }

  /**
   * バッチ操作の検証
   */
  static validateBatchOperation(operations: any[]): boolean {
    if (!Array.isArray(operations)) {
      return false;
    }

    // バッチサイズ制限
    if (operations.length > 100) {
      console.error('Batch size exceeds limit');
      return false;
    }

    // 各操作の検証
    for (const op of operations) {
      if (!this.validateQueryObject(op)) {
        return false;
      }
    }

    return true;
  }
}

// エクスポート用の型定義
export interface QueryFilter {
  field: string;
  operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike';
  value: any;
}

export interface SafeQuery {
  filters: QueryFilter[];
  limit?: number;
  offset?: number;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export class NoSQLInjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoSQLInjectionError';
  }
}