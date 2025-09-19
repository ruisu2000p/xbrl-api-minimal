/**
 * Path Traversal Protection System
 * Prevents directory traversal and path injection attacks
 */

import path from 'path';

export class PathSecurity {
  private static readonly ALLOWED_STORAGE_PATTERNS = [
    /^FY\d{4}\/[A-Z0-9\-]{1,20}\/(PublicDoc|AuditDoc|PublicDoc_markdown|AuditDoc_markdown)\/[\w\-\.]+\.md$/
  ];

  private static readonly DANGEROUS_PATH_PATTERNS = [
    /\.\./,
    /[<>:"|?*]/,
    /^\.+$/,
    /[\x00-\x1F]/
  ];

  /**
   * ストレージパスの包括的検証
   */
  static validateAndBuildStoragePath(
    fiscalYear: string,
    companyId: string,
    docType: string,
    filename: string
  ): string {
    // 個別コンポーネント検証
    this.validateFiscalYearComponent(fiscalYear);
    this.validateCompanyIdComponent(companyId);
    this.validateDocTypeComponent(docType);
    const safeName = this.sanitizeFilename(filename);

    // パス構築
    const constructedPath = `${fiscalYear}/${companyId}/${docType}/${safeName}`;

    // 最終安全性検証
    if (!this.isPathSafe(constructedPath)) {
      throw new SecurityError(`Unsafe path detected: ${constructedPath}`);
    }

    return constructedPath;
  }

  /**
   * ストレージパスの検証（既存パス用）
   */
  static validateStoragePath(storagePath: string): boolean {
    // 危険パターンチェック
    for (const pattern of this.DANGEROUS_PATH_PATTERNS) {
      if (pattern.test(storagePath)) {
        return false;
      }
    }

    // 許可パターンチェック
    return this.ALLOWED_STORAGE_PATTERNS.some(pattern => pattern.test(storagePath));
  }

  /**
   * ファイル名の安全なサニタイゼーション
   */
  private static sanitizeFilename(filename: string): string {
    if (!filename) {
      throw new SecurityError('Filename cannot be empty');
    }

    // 危険パターンの検出
    for (const pattern of this.DANGEROUS_PATH_PATTERNS) {
      if (pattern.test(filename)) {
        throw new SecurityError(`Dangerous pattern detected in filename: ${filename}`);
      }
    }

    // 安全な文字のみ許可
    const sanitized = filename
      .replace(/[^\w\-\.]/g, '')  // 英数字、ハイフン、ドットのみ
      .replace(/^\.+/, '')        // 先頭ドット除去
      .slice(0, 255);             // 長さ制限

    // 拡張子検証
    if (!sanitized.endsWith('.md')) {
      throw new SecurityError('Invalid file extension. Only .md files allowed');
    }

    return sanitized;
  }

  /**
   * パスの安全性最終チェック
   */
  private static isPathSafe(constructedPath: string): boolean {
    // 許可パターンとの照合
    const isPatternMatch = this.ALLOWED_STORAGE_PATTERNS.some(
      pattern => pattern.test(constructedPath)
    );

    if (!isPatternMatch) return false;

    // 正規化後の安全性確認
    const normalized = path.normalize(constructedPath);

    // Windowsパス区切り文字を統一
    const normalizedUnix = normalized.replace(/\\/g, '/');
    const constructedUnix = constructedPath.replace(/\\/g, '/');

    return normalizedUnix === constructedUnix && !normalizedUnix.includes('..');
  }

  private static validateFiscalYearComponent(fy: string): void {
    if (!/^FY\d{4}$/.test(fy)) {
      throw new SecurityError(`Invalid fiscal year component: ${fy}`);
    }
  }

  private static validateCompanyIdComponent(id: string): void {
    if (!/^[A-Z0-9\-]{1,20}$/.test(id)) {
      throw new SecurityError(`Invalid company ID component: ${id}`);
    }
  }

  private static validateDocTypeComponent(type: string): void {
    const allowedTypes = ['PublicDoc', 'AuditDoc', 'PublicDoc_markdown', 'AuditDoc_markdown'];
    if (!allowedTypes.includes(type)) {
      throw new SecurityError(`Invalid document type: ${type}`);
    }
  }

  /**
   * URLパスインジェクション防止
   */
  static sanitizeUrlPath(urlPath: string): string {
    // URLエンコード文字のデコード防止
    if (/%[0-9a-fA-F]{2}/.test(urlPath)) {
      throw new SecurityError('URL encoded characters not allowed');
    }

    // 危険な文字を除去
    const sanitized = urlPath
      .replace(/[<>'"]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .slice(0, 500); // URLパス長制限

    return sanitized;
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}