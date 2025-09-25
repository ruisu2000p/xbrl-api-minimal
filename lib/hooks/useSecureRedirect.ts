/**
 * Secure Redirect Hook for Client-Side
 * GitHub Security Alert #13 - クライアントサイドOpen Redirect防御
 */

import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';

interface SecureRedirectOptions {
  fallback?: string;
  validate?: boolean;
  logViolations?: boolean;
  allowExternal?: boolean;
  allowedDomains?: string[];
}

interface RedirectViolation {
  originalUrl: string;
  reason: string;
  timestamp: string;
  location: string;
}

export function useSecureRedirect() {
  const router = useRouter();
  const violationsRef = useRef<RedirectViolation[]>([]);

  /**
   * URLの安全性を検証
   */
  const isUrlSafe = useCallback((url: string, allowedDomains: string[] = []): boolean => {
    if (!url || typeof url !== 'string') {
      return false;
    }

    const lowerUrl = url.toLowerCase().trim();

    // 危険なスキーマの検出
    const dangerousSchemas = [
      'javascript:',
      'data:',
      'vbscript:',
      'about:',
      'chrome:',
      'file:',
      'ftp:'
    ];

    if (dangerousSchemas.some(schema => lowerUrl.startsWith(schema))) {
      return false;
    }

    // 相対URLは安全
    if (url.startsWith('/') && !url.startsWith('//')) {
      // パストラバーサルチェック
      if (url.includes('..') || url.includes('\\')) {
        return false;
      }
      return true;
    }

    // プロトコル相対URLは危険
    if (url.startsWith('//')) {
      return false;
    }

    // 絶対URLの検証
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const urlObj = new URL(url);

        // 同一オリジンチェック
        if (typeof window !== 'undefined') {
          if (urlObj.origin === window.location.origin) {
            return true;
          }
        }

        // 許可ドメインチェック
        const defaultAllowedDomains = [
          'localhost',
          '127.0.0.1',
          'xbrl-api-minimal.vercel.app'
        ];

        const allAllowedDomains = [...defaultAllowedDomains, ...allowedDomains];

        return allAllowedDomains.some(domain => {
          return urlObj.hostname === domain ||
                 urlObj.hostname.endsWith('.' + domain);
        });

      } catch {
        return false;
      }
    }

    return false;
  }, []);

  /**
   * セキュアなリダイレクト実行
   */
  const secureRedirect = useCallback((
    targetUrl: string,
    options: SecureRedirectOptions = {}
  ) => {
    const {
      fallback = '/dashboard',
      validate = true,
      logViolations = true,
      allowExternal = false,
      allowedDomains = []
    } = options;

    // バリデーションをスキップする場合
    if (!validate) {
      router.push(targetUrl);
      return;
    }

    // 基本的な検証
    if (!targetUrl || typeof targetUrl !== 'string') {
      if (logViolations) {
        console.warn('🚨 Client-side redirect violation: Invalid URL format');
      }
      router.push(fallback);
      return;
    }

    // 危険なスキーマの検出
    const dangerousPatterns = [
      'javascript:',
      'data:',
      'vbscript:',
      'about:',
      'chrome:'
    ];

    const lowerUrl = targetUrl.toLowerCase().trim();

    for (const pattern of dangerousPatterns) {
      if (lowerUrl.startsWith(pattern)) {
        const violation: RedirectViolation = {
          originalUrl: targetUrl,
          reason: `Dangerous schema detected: ${pattern}`,
          timestamp: new Date().toISOString(),
          location: typeof window !== 'undefined' ? window.location.href : 'unknown'
        };

        violationsRef.current.push(violation);

        if (logViolations) {
          console.warn('🚨 Client-side redirect violation:', violation);
        }

        // セキュリティイベントの送信（本番環境）
        if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
          sendSecurityEvent(violation);
        }

        router.push(fallback);
        return;
      }
    }

    // パストラバーサルの検出
    if (targetUrl.includes('..') || targetUrl.includes('\\')) {
      const violation: RedirectViolation = {
        originalUrl: targetUrl,
        reason: 'Path traversal detected',
        timestamp: new Date().toISOString(),
        location: typeof window !== 'undefined' ? window.location.href : 'unknown'
      };

      violationsRef.current.push(violation);

      if (logViolations) {
        console.warn('🚨 Client-side redirect violation:', violation);
      }

      router.push(fallback);
      return;
    }

    // 相対URLまたは同一オリジンのみ許可（デフォルト）
    if (targetUrl.startsWith('/')) {
      // ダブルスラッシュを防ぐ
      if (targetUrl.startsWith('//')) {
        if (logViolations) {
          console.warn('🚨 Client-side redirect violation: Protocol-relative URL');
        }
        router.push(fallback);
        return;
      }

      // 安全な相対URLとして処理
      router.push(targetUrl);
      return;
    }

    // 絶対URLの処理
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      try {
        const url = new URL(targetUrl);

        // 同一オリジンチェック
        if (typeof window !== 'undefined' && url.origin === window.location.origin) {
          router.push(targetUrl);
          return;
        }

        // 外部URLが許可されている場合
        if (allowExternal) {
          const isAllowed = isUrlSafe(targetUrl, allowedDomains);

          if (isAllowed) {
            // 外部URLへのリダイレクト（window.location使用）
            if (typeof window !== 'undefined') {
              window.location.href = targetUrl;
            }
            return;
          }
        }

        // 外部URLは拒否
        const violation: RedirectViolation = {
          originalUrl: targetUrl,
          reason: 'External URL not allowed',
          timestamp: new Date().toISOString(),
          location: typeof window !== 'undefined' ? window.location.href : 'unknown'
        };

        violationsRef.current.push(violation);

        if (logViolations) {
          console.warn('🚨 Client-side redirect violation:', violation);
        }

        router.push(fallback);

      } catch (error) {
        if (logViolations) {
          console.warn('🚨 Client-side redirect violation: Invalid URL format', error);
        }
        router.push(fallback);
      }
    } else {
      // 不明な形式は拒否
      if (logViolations) {
        console.warn('🚨 Client-side redirect violation: Unsupported URL format');
      }
      router.push(fallback);
    }
  }, [router, isUrlSafe]);

  /**
   * 条件付きリダイレクト
   */
  const conditionalRedirect = useCallback((
    condition: boolean,
    trueUrl: string,
    falseUrl: string,
    options?: SecureRedirectOptions
  ) => {
    const targetUrl = condition ? trueUrl : falseUrl;
    secureRedirect(targetUrl, options);
  }, [secureRedirect]);

  /**
   * 遅延リダイレクト
   */
  const delayedRedirect = useCallback((
    targetUrl: string,
    delayMs: number,
    options?: SecureRedirectOptions
  ): { cancel: () => void } => {
    const timeoutId = setTimeout(() => {
      secureRedirect(targetUrl, options);
    }, delayMs);

    return {
      cancel: () => clearTimeout(timeoutId)
    };
  }, [secureRedirect]);

  /**
   * セキュリティ違反の取得
   */
  const getViolations = useCallback((): RedirectViolation[] => {
    return [...violationsRef.current];
  }, []);

  /**
   * セキュリティ違反のクリア
   */
  const clearViolations = useCallback(() => {
    violationsRef.current = [];
  }, []);

  return {
    secureRedirect,
    conditionalRedirect,
    delayedRedirect,
    isUrlSafe,
    getViolations,
    clearViolations
  };
}

/**
 * セキュリティイベントをサーバーに送信
 */
async function sendSecurityEvent(violation: RedirectViolation): Promise<void> {
  try {
    await fetch('/api/security/violations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'CLIENT_REDIRECT_VIOLATION',
        ...violation
      })
    });
  } catch (error) {
    console.error('Failed to send security event:', error);
  }
}

/**
 * URLパラメータからリダイレクトURLを安全に取得
 */
export function getSecureRedirectUrl(
  paramName: string = 'redirect',
  fallback: string = '/dashboard'
): string {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const params = new URLSearchParams(window.location.search);
  const redirectUrl = params.get(paramName);

  if (!redirectUrl) {
    return fallback;
  }

  // 基本的な検証
  const dangerousPatterns = [
    'javascript:',
    'data:',
    'vbscript:',
    'about:'
  ];

  const lowerUrl = redirectUrl.toLowerCase();

  if (dangerousPatterns.some(pattern => lowerUrl.startsWith(pattern))) {
    console.warn('Dangerous redirect URL detected:', redirectUrl);
    return fallback;
  }

  // 相対URLのみ許可
  if (redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
    // パストラバーサルチェック
    if (!redirectUrl.includes('..') && !redirectUrl.includes('\\')) {
      return redirectUrl;
    }
  }

  // 同一オリジンの絶対URL
  if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
    try {
      const url = new URL(redirectUrl);
      if (url.origin === window.location.origin) {
        return redirectUrl;
      }
    } catch {
      // 無効なURL
    }
  }

  return fallback;
}