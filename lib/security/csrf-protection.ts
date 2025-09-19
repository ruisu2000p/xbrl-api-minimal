/**
 * CSRF Protection System
 * Double-submit cookie pattern with HMAC signatures
 */

import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

export class CSRFProtection {
  private static readonly SECRET_KEY = process.env.CSRF_SECRET_KEY || this.generateSecret();
  private static readonly TOKEN_LIFETIME = 3600000; // 1時間
  private static readonly TOKEN_LENGTH = 32;

  /**
   * セキュアなCSRFトークン生成
   */
  static generateToken(sessionId: string, userAgent?: string): string {
    const timestamp = Date.now().toString();
    const nonce = randomBytes(16).toString('hex');
    const context = `${sessionId}:${timestamp}:${nonce}:${userAgent || ''}`;

    const signature = createHmac('sha256', this.SECRET_KEY)
      .update(context)
      .digest('hex');

    const tokenData = {
      s: sessionId,
      t: timestamp,
      n: nonce,
      h: signature
    };

    return Buffer.from(JSON.stringify(tokenData)).toString('base64');
  }

  /**
   * CSRFトークンの厳格な検証
   */
  static validateToken(
    token: string,
    sessionId: string,
    userAgent?: string
  ): ValidationResult {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      const { s, t, n, h } = decoded;

      // セッションID検証
      if (s !== sessionId) {
        return { valid: false, reason: 'SESSION_MISMATCH' };
      }

      // 有効期限検証
      const tokenTime = parseInt(t);
      if (Date.now() - tokenTime > this.TOKEN_LIFETIME) {
        return { valid: false, reason: 'TOKEN_EXPIRED' };
      }

      // 署名検証
      const context = `${s}:${t}:${n}:${userAgent || ''}`;
      const expectedSignature = createHmac('sha256', this.SECRET_KEY)
        .update(context)
        .digest('hex');

      // タイミング攻撃対策のための定時間比較
      const expected = Buffer.from(h, 'hex');
      const actual = Buffer.from(expectedSignature, 'hex');

      if (expected.length !== actual.length) {
        return { valid: false, reason: 'SIGNATURE_INVALID' };
      }

      if (!timingSafeEqual(expected, actual)) {
        return { valid: false, reason: 'SIGNATURE_INVALID' };
      }

      return { valid: true, reason: 'VALID' };

    } catch (error) {
      return { valid: false, reason: 'MALFORMED_TOKEN' };
    }
  }

  /**
   * ダブルサブミットクッキー用のトークン生成
   */
  static generateDoubleSubmitToken(): { token: string; cookieValue: string } {
    const token = randomBytes(this.TOKEN_LENGTH).toString('hex');
    const timestamp = Date.now().toString();
    const signature = createHmac('sha256', this.SECRET_KEY)
      .update(`${token}:${timestamp}`)
      .digest('hex');

    const cookieValue = `${token}.${timestamp}.${signature}`;

    return { token, cookieValue };
  }

  /**
   * ダブルサブミットクッキーの検証
   */
  static validateDoubleSubmitToken(
    headerToken: string,
    cookieValue: string
  ): boolean {
    try {
      const [token, timestamp, signature] = cookieValue.split('.');

      // ヘッダートークンとクッキートークンの一致確認
      if (headerToken !== token) {
        return false;
      }

      // 有効期限確認
      const tokenTime = parseInt(timestamp);
      if (Date.now() - tokenTime > this.TOKEN_LIFETIME) {
        return false;
      }

      // 署名検証
      const expectedSignature = createHmac('sha256', this.SECRET_KEY)
        .update(`${token}:${timestamp}`)
        .digest('hex');

      return signature === expectedSignature;

    } catch (error) {
      return false;
    }
  }

  /**
   * Origin/Refererヘッダー検証
   */
  static validateOrigin(
    origin: string | null,
    referer: string | null,
    allowedOrigins: string[]
  ): boolean {
    // どちらかのヘッダーが存在することを確認
    if (!origin && !referer) {
      return false;
    }

    const checkOrigin = origin || this.extractOriginFromReferer(referer!);

    // 許可されたOriginのリストと照合
    return allowedOrigins.some(allowed => {
      if (allowed === checkOrigin) return true;

      // ワイルドカードサブドメインのサポート
      if (allowed.startsWith('*.')) {
        const domain = allowed.substring(2);
        const url = new URL(checkOrigin);
        return url.hostname.endsWith(domain);
      }

      return false;
    });
  }

  private static extractOriginFromReferer(referer: string): string {
    try {
      const url = new URL(referer);
      return `${url.protocol}//${url.host}`;
    } catch {
      return '';
    }
  }

  private static generateSecret(): string {
    const secret = randomBytes(32).toString('hex');
    console.warn('Generated new CSRF secret. Set CSRF_SECRET_KEY environment variable for production.');
    return secret;
  }

  /**
   * SameSiteクッキーの設定生成
   */
  static getCookieOptions(secure: boolean = true): CookieOptions {
    return {
      httpOnly: true,
      secure: secure,
      sameSite: 'strict',
      maxAge: this.TOKEN_LIFETIME,
      path: '/'
    };
  }
}

interface ValidationResult {
  valid: boolean;
  reason: 'VALID' | 'SESSION_MISMATCH' | 'TOKEN_EXPIRED' | 'SIGNATURE_INVALID' | 'MALFORMED_TOKEN';
}

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
}

export type { ValidationResult, CookieOptions };