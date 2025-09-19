/**
 * Enhanced XSS Protection
 * GitHub Security Alert #78 - 強化されたXSS対策
 */

export class XSSProtectionEnhanced {
  private static readonly DANGEROUS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
    /data:text\/html/gi,
    /<link[^>]*rel=["']?stylesheet["']?[^>]*>/gi,
    /vbscript:/gi,
    /<svg[^>]*on\w+=[^>]*>/gi,
    /<img[^>]*on\w+=[^>]*>/gi,
    /<body[^>]*on\w+=[^>]*>/gi,
    /<style[^>]*>.*?<\/style>/gi,
    /expression\s*\(/gi,
    /import\s+/gi,
    /@import/gi
  ];

  private static readonly SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

  private static readonly HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  /**
   * 包括的XSSサニタイゼーション
   */
  static sanitizeForOutput(input: any): any {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeForOutput(item));
    }

    if (typeof input === 'object') {
      // 循環参照チェック
      const seen = new WeakSet();
      return this.sanitizeObject(input, seen);
    }

    // プリミティブ型はそのまま返す
    return input;
  }

  /**
   * オブジェクトの再帰的サニタイゼーション
   */
  private static sanitizeObject(obj: any, seen: WeakSet<object>): any {
    if (seen.has(obj)) {
      return '[Circular Reference]';
    }

    seen.add(obj);

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // キー名もサニタイズ
      const sanitizedKey = this.sanitizeString(key);

      if (value && typeof value === 'object') {
        sanitized[sanitizedKey] = Array.isArray(value)
          ? value.map(item => this.sanitizeForOutput(item))
          : this.sanitizeObject(value, seen);
      } else {
        sanitized[sanitizedKey] = this.sanitizeForOutput(value);
      }
    }

    return sanitized;
  }

  /**
   * 文字列の安全なサニタイゼーション
   */
  private static sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') {
      return '';
    }

    // 長さ制限（DoS対策）
    let sanitized = str.slice(0, 10000);

    // HTML エンティティエスケープ
    sanitized = sanitized.replace(/[&<>"'`=\/]/g, (match) =>
      this.HTML_ENTITIES[match] || match
    );

    // 危険パターンの除去
    for (const pattern of this.DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // 制御文字の除去（タブと改行は保持）
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // URL検証とサニタイゼーション
    if (this.isURL(str)) {
      sanitized = this.sanitizeURL(str);
    }

    // Unicode正規化（セキュリティ向上）
    try {
      sanitized = sanitized.normalize('NFC');
    } catch {
      // 正規化失敗時はそのまま続行
    }

    return sanitized;
  }

  /**
   * URLの安全性検証とサニタイゼーション
   */
  private static sanitizeURL(url: string): string {
    try {
      const parsed = new URL(url);

      // 危険なプロトコルのチェック
      if (!this.SAFE_PROTOCOLS.includes(parsed.protocol)) {
        return '';
      }

      // javascript: URLの追加チェック
      if (url.toLowerCase().includes('javascript:')) {
        return '';
      }

      // data: URLの制限（画像のみ許可）
      if (parsed.protocol === 'data:') {
        const isImage = url.match(/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/i);
        if (!isImage) {
          return '';
        }
      }

      // URLエンコードされた危険な文字列のチェック
      const decodedURL = decodeURIComponent(url);
      if (/<script|javascript:|on\w+=/i.test(decodedURL)) {
        return '';
      }

      return parsed.toString();
    } catch {
      // 無効なURLは空文字に
      return '';
    }
  }

  /**
   * URL判定
   */
  private static isURL(str: string): boolean {
    try {
      const url = new URL(str);
      return true;
    } catch {
      // 相対URLかもしれない
      if (/^\/[^\/]/.test(str) || /^\.\.?\//.test(str)) {
        return true;
      }
      return false;
    }
  }

  /**
   * HTMLコンテンツのサニタイゼーション（マークダウン等）
   */
  static sanitizeHTML(html: string): string {
    if (!html) return '';

    // 基本的なサニタイゼーション
    let sanitized = this.sanitizeString(html);

    // 安全なHTMLタグのホワイトリスト
    const safeTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                      'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'span', 'div'];

    // 安全なタグ以外を除去
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi;
    sanitized = sanitized.replace(tagPattern, (match, tag) => {
      if (safeTags.includes(tag.toLowerCase())) {
        // 安全なタグでも属性は制限
        if (tag.toLowerCase() === 'a') {
          // aタグはhrefのみ許可
          return match.replace(/\s+(?!href=)[a-zA-Z-]+="[^"]*"/gi, '');
        }
        // その他のタグは属性を全て除去
        return `<${match.startsWith('</') ? '/' : ''}${tag}>`;
      }
      return '';
    });

    return sanitized;
  }

  /**
   * JSONデータのサニタイゼーション
   */
  static sanitizeJSON(data: any): any {
    try {
      // JSONとして解析して再構築（関数等を除去）
      const jsonString = JSON.stringify(data);
      const parsed = JSON.parse(jsonString);
      return this.sanitizeForOutput(parsed);
    } catch {
      return null;
    }
  }

  /**
   * SQLインジェクション対策文字のエスケープ
   */
  static escapeSQLChars(input: string): string {
    if (!input || typeof input !== 'string') return '';

    return input
      .replace(/'/g, "''")  // シングルクォートをエスケープ
      .replace(/"/g, '""')  // ダブルクォートをエスケープ
      .replace(/\\/g, '\\\\') // バックスラッシュをエスケープ
      .replace(/\x00/g, '') // NULLバイトを除去
      .replace(/\n/g, '\\n') // 改行をエスケープ
      .replace(/\r/g, '\\r') // キャリッジリターンをエスケープ
      .replace(/\x1a/g, ''); // SUB文字を除去
  }

  /**
   * ファイル名のサニタイゼーション
   */
  static sanitizeFilename(filename: string): string {
    if (!filename) return '';

    // 危険な文字を除去
    let sanitized = filename.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '');

    // ディレクトリトラバーサル対策
    sanitized = sanitized.replace(/\.\./g, '');

    // 先頭と末尾のドットとスペースを除去
    sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');

    // 長さ制限
    if (sanitized.length > 255) {
      const ext = sanitized.lastIndexOf('.');
      if (ext > 0) {
        const name = sanitized.slice(0, ext).slice(0, 240);
        const extension = sanitized.slice(ext);
        sanitized = name + extension;
      } else {
        sanitized = sanitized.slice(0, 255);
      }
    }

    return sanitized || 'unnamed';
  }

  /**
   * CSVインジェクション対策
   */
  static sanitizeCSVField(field: string): string {
    if (!field) return '';

    // 数式インジェクション対策
    const formulaChars = ['=', '+', '-', '@', '\t', '\r'];
    if (formulaChars.some(char => field.startsWith(char))) {
      field = "'" + field;
    }

    // 特殊文字のエスケープ
    if (field.includes('"') || field.includes(',') || field.includes('\n')) {
      field = '"' + field.replace(/"/g, '""') + '"';
    }

    return field;
  }
}

// エクスポート用の型定義
export interface SanitizationOptions {
  allowHTML?: boolean;
  maxLength?: number;
  allowedTags?: string[];
  allowedProtocols?: string[];
}

export class XSSError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XSSError';
  }
}