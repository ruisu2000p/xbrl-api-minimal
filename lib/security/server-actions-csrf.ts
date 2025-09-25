/**
 * Server Actions CSRF Protection
 * GitHub Security Alert #78 - Next.js Server Actions CSRF対策
 */

import { cookies } from 'next/headers';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export class ServerActionsCSRF {
  private static readonly TOKEN_NAME = '__csrf_token';
  private static readonly SECRET_KEY = process.env.CSRF_SECRET_KEY || this.generateSecret();
  private static readonly TOKEN_EXPIRY = 3600000; // 1時間

  /**
   * CSRF トークン生成
   */
  static generateToken(): string {
    const token = randomBytes(32).toString('hex');
    const timestamp = Date.now().toString();
    const signature = createHash('sha256')
      .update(`${token}:${timestamp}:${this.SECRET_KEY}`)
      .digest('hex');

    return `${token}:${timestamp}:${signature}`;
  }

  /**
   * Server Actions用CSRF検証
   */
  static async validateServerAction(formData: FormData): Promise<boolean> {
    try {
      const submittedToken = formData.get(this.TOKEN_NAME) as string;
      const cookieStore = cookies();
      const cookieToken = cookieStore.get(this.TOKEN_NAME)?.value;

      if (!submittedToken || !cookieToken) {
        console.error('CSRF token missing');
        return false;
      }

      // トークンの一致を時間安全に比較
      const submittedBuffer = Buffer.from(submittedToken);
      const cookieBuffer = Buffer.from(cookieToken);

      if (submittedBuffer.length !== cookieBuffer.length) {
        return false;
      }

      if (!timingSafeEqual(Uint8Array.from(submittedBuffer), Uint8Array.from(cookieBuffer))) {
        console.error('CSRF token mismatch');
        return false;
      }

      return this.validateToken(submittedToken);
    } catch (error) {
      console.error('CSRF validation error:', error);
      return false;
    }
  }

  /**
   * フォーム用CSRF トークン埋め込み
   */
  static getTokenInput(): string {
    const token = this.generateToken();
    const cookieStore = cookies();

    // Cookieに設定
    cookieStore.set(this.TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.TOKEN_EXPIRY / 1000, // 秒単位
      path: '/'
    });

    return `<input type="hidden" name="${this.TOKEN_NAME}" value="${token}" />`;
  }

  /**
   * React コンポーネント用トークン取得
   */
  static async getTokenForComponent(): Promise<{ name: string; value: string }> {
    const token = this.generateToken();
    const cookieStore = cookies();

    cookieStore.set(this.TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.TOKEN_EXPIRY / 1000,
      path: '/'
    });

    return {
      name: this.TOKEN_NAME,
      value: token
    };
  }

  /**
   * トークン検証
   */
  private static validateToken(token: string): boolean {
    try {
      const parts = token.split(':');
      if (parts.length !== 3) {
        return false;
      }

      const [tokenValue, timestamp, signature] = parts;

      // タイムスタンプ検証
      const tokenTime = parseInt(timestamp, 10);
      if (isNaN(tokenTime) || Date.now() - tokenTime > this.TOKEN_EXPIRY) {
        console.error('CSRF token expired');
        return false;
      }

      // 署名検証（時間安全比較）
      const expectedSignature = createHash('sha256')
        .update(`${tokenValue}:${timestamp}:${this.SECRET_KEY}`)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature);
      const signatureBuffer = Buffer.from(signature);

      if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
      }

      return timingSafeEqual(Uint8Array.from(expectedBuffer), Uint8Array.from(signatureBuffer));
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  /**
   * シークレットキー生成
   */
  private static generateSecret(): string {
    const secret = randomBytes(64).toString('hex');
    console.warn('⚠️ Generated new CSRF secret. Set CSRF_SECRET_KEY environment variable in production.');
    return secret;
  }

  /**
   * APIルート用CSRF検証（ヘッダーベース）
   */
  static async validateAPIRoute(request: Request): Promise<boolean> {
    try {
      const token = request.headers.get('X-CSRF-Token');
      const cookieHeader = request.headers.get('Cookie');

      if (!token || !cookieHeader) {
        return false;
      }

      // Cookieからトークンを抽出
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const csrfCookie = cookies.find(c => c.startsWith(`${this.TOKEN_NAME}=`));

      if (!csrfCookie) {
        return false;
      }

      const cookieToken = csrfCookie.split('=')[1];

      // 時間安全比較
      const tokenBuffer = Buffer.from(token);
      const cookieBuffer = Buffer.from(cookieToken);

      if (tokenBuffer.length !== cookieBuffer.length) {
        return false;
      }

      if (!timingSafeEqual(Uint8Array.from(tokenBuffer), Uint8Array.from(cookieBuffer))) {
        return false;
      }

      return this.validateToken(token);
    } catch (error) {
      console.error('API CSRF validation error:', error);
      return false;
    }
  }
}

// エクスポート
export type CSRFToken = {
  name: string;
  value: string;
};

export class CSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CSRFError';
  }
}