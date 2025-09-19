/**
 * OAuth Security Validator
 * GitHub Security Alert #13 - OAuth State Parameter Security
 * OAuth 2.0 State Parameter による CSRF とOpen Redirect防御
 */

import { RedirectValidator } from '@/lib/security/redirect-validator';
import crypto from 'crypto';

export class OAuthSecurityValidator {
  private static readonly OAUTH_STATE_EXPIRY = 10 * 60 * 1000; // 10分
  private static readonly STATE_SIGNATURE_KEY = process.env.OAUTH_STATE_SECRET || 'default-oauth-secret';
  private static readonly NONCE_LENGTH = 32;

  /**
   * OAuth state parameter を安全に生成
   */
  static generateSecureState(redirectUrl?: string, additionalData?: Record<string, any>): string {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(this.NONCE_LENGTH).toString('hex');

    const stateData: OAuthStateData = {
      nonce,
      timestamp,
      redirect: redirectUrl ? this.encodeRedirectUrl(redirectUrl) : null,
      additional: additionalData || {},
      version: '1.0'
    };

    // 署名の生成（改ざん防止）
    const signature = this.generateSignature(stateData);
    stateData.signature = signature;

    // Base64エンコード
    const stateString = JSON.stringify(stateData);
    const encoded = Buffer.from(stateString).toString('base64url');

    return encoded;
  }

  /**
   * OAuth state parameter を検証
   */
  static validateOAuthState(state: string, requestUrl?: string): StateValidation {
    const startTime = Date.now();

    try {
      // Base64デコード
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      const stateData: OAuthStateData = JSON.parse(decoded);

      // バージョンチェック
      if (stateData.version !== '1.0') {
        return {
          isValid: false,
          error: 'Unsupported state version',
          code: 'INVALID_VERSION',
          processingTime: Date.now() - startTime
        };
      }

      // 署名検証（改ざんチェック）
      const signature = stateData.signature;
      delete stateData.signature;

      const expectedSignature = this.generateSignature(stateData);
      if (!signature || !this.timingSafeEqual(signature, expectedSignature)) {
        return {
          isValid: false,
          error: 'State signature verification failed',
          code: 'INVALID_SIGNATURE',
          threat: 'STATE_TAMPERING',
          processingTime: Date.now() - startTime
        };
      }

      // タイムスタンプ検証（有効期限チェック）
      const age = Date.now() - stateData.timestamp;
      if (age > this.OAUTH_STATE_EXPIRY) {
        return {
          isValid: false,
          error: `OAuth state expired (age: ${Math.round(age / 1000)}s)`,
          code: 'STATE_EXPIRED',
          processingTime: Date.now() - startTime
        };
      }

      // リプレイ攻撃の防御（将来的な実装用）
      if (age < 0) {
        return {
          isValid: false,
          error: 'State timestamp is in the future',
          code: 'FUTURE_TIMESTAMP',
          threat: 'TIME_MANIPULATION',
          processingTime: Date.now() - startTime
        };
      }

      // Nonce検証（長さチェック）
      if (!stateData.nonce || stateData.nonce.length !== this.NONCE_LENGTH * 2) {
        return {
          isValid: false,
          error: 'Invalid nonce',
          code: 'INVALID_NONCE',
          processingTime: Date.now() - startTime
        };
      }

      // リダイレクトURL検証
      let redirectUrl = '/dashboard';
      if (stateData.redirect) {
        const decodedRedirect = this.decodeRedirectUrl(stateData.redirect);

        // RedirectValidatorを使用して検証
        const validation = RedirectValidator.validateRedirectUrl(
          decodedRedirect,
          requestUrl || 'https://xbrl-api-minimal.vercel.app'
        );

        if (!validation.isValid) {
          return {
            isValid: false,
            error: 'Invalid redirect URL in state',
            code: 'INVALID_REDIRECT_IN_STATE',
            threat: validation.threat,
            details: validation.error,
            processingTime: Date.now() - startTime
          };
        }

        redirectUrl = validation.sanitizedUrl!;
      }

      return {
        isValid: true,
        redirectUrl,
        timestamp: stateData.timestamp,
        nonce: stateData.nonce,
        additionalData: stateData.additional,
        age: Math.round(age / 1000), // 秒単位
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid OAuth state format',
        code: 'INVALID_STATE_FORMAT',
        details: error instanceof Error ? error.message : 'State parsing failed',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * PKCE (Proof Key for Code Exchange) チャレンジの生成
   */
  static generatePKCEChallenge(): PKCEChallenge {
    // Code Verifierの生成（43-128文字のランダム文字列）
    const verifier = crypto.randomBytes(32).toString('base64url');

    // Code Challengeの生成（SHA256ハッシュのBase64URL）
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');

    return {
      codeVerifier: verifier,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256'
    };
  }

  /**
   * PKCE Code Verifierの検証
   */
  static verifyPKCEChallenge(
    codeVerifier: string,
    codeChallenge: string,
    method: string = 'S256'
  ): boolean {
    if (method !== 'S256') {
      console.warn('Only S256 challenge method is supported');
      return false;
    }

    const expectedChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return this.timingSafeEqual(expectedChallenge, codeChallenge);
  }

  /**
   * リダイレクトURLのエンコード
   */
  private static encodeRedirectUrl(url: string): string {
    // URLを二重エンコードして安全に保存
    return Buffer.from(encodeURIComponent(url)).toString('base64url');
  }

  /**
   * リダイレクトURLのデコード
   */
  private static decodeRedirectUrl(encoded: string): string {
    try {
      const decoded = Buffer.from(encoded, 'base64url').toString('utf-8');
      return decodeURIComponent(decoded);
    } catch (error) {
      console.error('Failed to decode redirect URL:', error);
      return '/dashboard'; // 安全なデフォルト値
    }
  }

  /**
   * 署名の生成（HMAC-SHA256）
   */
  private static generateSignature(data: Omit<OAuthStateData, 'signature'>): string {
    const message = JSON.stringify({
      nonce: data.nonce,
      timestamp: data.timestamp,
      redirect: data.redirect,
      version: data.version
    });

    return crypto
      .createHmac('sha256', this.STATE_SIGNATURE_KEY)
      .update(message)
      .digest('hex');
  }

  /**
   * タイミング攻撃を防ぐための安全な文字列比較
   */
  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return crypto.timingSafeEqual(bufferA, bufferB);
  }

  /**
   * OAuth認証URLの構築（セキュア版）
   */
  static buildSecureAuthUrl(params: OAuthUrlParams): string {
    const url = new URL(params.authEndpoint);

    // 必須パラメータの設定
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('response_type', params.responseType || 'code');
    url.searchParams.set('scope', params.scope || 'openid profile email');

    // リダイレクトURIの検証と設定
    const redirectValidation = RedirectValidator.validateRedirectUrl(
      params.redirectUri,
      params.authEndpoint
    );

    if (!redirectValidation.isValid) {
      throw new Error(`Invalid redirect URI: ${redirectValidation.error}`);
    }

    url.searchParams.set('redirect_uri', params.redirectUri);

    // セキュアなStateの生成と設定
    const state = this.generateSecureState(params.postAuthRedirect);
    url.searchParams.set('state', state);

    // PKCE対応
    if (params.usePKCE) {
      const pkce = this.generatePKCEChallenge();
      url.searchParams.set('code_challenge', pkce.codeChallenge);
      url.searchParams.set('code_challenge_method', pkce.codeChallengeMethod);

      // Code Verifierは後で使用するため返す必要がある
      (params as any)._codeVerifier = pkce.codeVerifier;
    }

    // Nonceの追加（OpenID Connect）
    if (params.includeNonce) {
      const nonce = crypto.randomBytes(16).toString('hex');
      url.searchParams.set('nonce', nonce);
    }

    return url.toString();
  }

  /**
   * セキュリティイベントのログ記録
   */
  static logOAuthSecurityEvent(event: OAuthSecurityEvent): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'OAUTH_SECURITY_EVENT',
      ...event
    };

    if (process.env.NODE_ENV === 'production') {
      console.error('🔐 OAuth Security Event:', logEntry);
      // TODO: 外部ログサービスへの送信
    } else {
      console.warn('OAuth Security Event (Dev):', logEntry);
    }
  }
}

// 型定義
interface OAuthStateData {
  nonce: string;
  timestamp: number;
  redirect: string | null;
  additional: Record<string, any>;
  version: string;
  signature?: string;
}

export interface StateValidation {
  isValid: boolean;
  redirectUrl?: string;
  timestamp?: number;
  nonce?: string;
  additionalData?: Record<string, any>;
  age?: number; // 秒単位
  error?: string;
  code?: string;
  threat?: string;
  details?: string;
  processingTime: number;
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

export interface OAuthUrlParams {
  authEndpoint: string;
  clientId: string;
  redirectUri: string;
  responseType?: string;
  scope?: string;
  postAuthRedirect?: string;
  usePKCE?: boolean;
  includeNonce?: boolean;
}

export interface OAuthSecurityEvent {
  event: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: Record<string, any>;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}