/**
 * Security validation utilities for XBRL API
 * Prevents common vulnerabilities: SSRF, XSS, SQL Injection
 */

import { z } from 'zod'

// APIキーのフォーマット検証
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const CUSTOM_API_KEY_REGEX = /^xbrl_v[1-9]_[a-zA-Z0-9]{32}$/

/**
 * APIキーフォーマットの検証
 */
export function validateApiKeyFormat(keyId: string): boolean {
  if (!keyId || typeof keyId !== 'string') {
    return false
  }
  return UUID_REGEX.test(keyId) || CUSTOM_API_KEY_REGEX.test(keyId)
}

/**
 * URLの安全性検証（SSRF対策）
 */
export function validateUrl(url: string): boolean {
  if (!url) return false

  try {
    const parsed = new URL(url)

    // HTTPSのみ許可（開発環境ではHTTPも許可）
    const allowedProtocols = process.env.NODE_ENV === 'development'
      ? ['https:', 'http:']
      : ['https:']

    if (!allowedProtocols.includes(parsed.protocol)) {
      return false
    }

    // 内部ネットワークへのアクセスをブロック
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '[::1]',
      '[::ffff:127.0.0.1]'
    ]

    const hostname = parsed.hostname.toLowerCase()

    if (blockedHosts.includes(hostname)) {
      return false
    }

    // プライベートIPアドレスをブロック
    const privateIpRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,  // Link-local
      /^fc00:/,       // IPv6 unique local
      /^fe80:/        // IPv6 link-local
    ]

    if (privateIpRanges.some(range => range.test(hostname))) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * SQLインジェクション対策用のサニタイズ
 */
export function sanitizeSqlInput(input: string): string {
  if (!input) return ''

  // 危険な文字をエスケープ
  return input
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '')
    .replace(/sp_/gi, '')
}

/**
 * XSS対策用のHTMLエスケープ
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }
  return text.replace(/[&<>"'/]/g, char => map[char])
}

/**
 * ファイルパスのトラバーサル攻撃対策
 */
export function sanitizeFilePath(path: string): string {
  if (!path) return ''

  // 危険なパターンを削除
  return path
    .replace(/\.\./g, '')
    .replace(/~\//g, '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\//, '')
}

// Zodスキーマ定義

/**
 * APIキー検証スキーマ
 */
export const ApiKeySchema = z.object({
  keyId: z.string()
    .refine(validateApiKeyFormat, {
      message: 'Invalid API key format'
    }),
  tier: z.enum(['free', 'basic', 'premium']).optional(),
  name: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Invalid characters in name'),
  permissions: z.array(z.string()).optional()
})

/**
 * 企業検索パラメータスキーマ
 */
export const CompanySearchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query too long')
    .transform(s => s.trim()),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(10),
  offset: z.number()
    .int()
    .min(0)
    .default(0),
  fiscalYear: z.string()
    .regex(/^FY\d{4}$/, 'Invalid fiscal year format')
    .optional(),
  companyId: z.string()
    .regex(/^[A-Z0-9]{8}$/, 'Invalid company ID format')
    .optional()
})

/**
 * ユーザー認証スキーマ
 */
export const AuthSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number and special character'
    )
})

/**
 * 安全なURL構築ヘルパー
 */
export function buildSecureUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string>
): string {
  if (!validateUrl(baseUrl)) {
    throw new Error('Invalid base URL')
  }

  const url = new URL(baseUrl)

  // パスを安全に追加
  const sanitizedPath = sanitizeFilePath(path)
  url.pathname = url.pathname.replace(/\/$/, '') + '/' + sanitizedPath

  // クエリパラメータを安全に追加
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (key && value) {
        url.searchParams.append(
          encodeURIComponent(key),
          encodeURIComponent(value)
        )
      }
    })
  }

  return url.toString()
}

/**
 * レート制限チェック用のキー生成
 */
export function getRateLimitKey(
  identifier: string,
  action: string
): string {
  return `rate_limit:${action}:${identifier}`
}

/**
 * IPアドレスの取得（プロキシ対応）
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  return 'unknown'
}

/**
 * セキュアな乱数生成（暗号学的に安全）
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * タイミング攻撃対策付き文字列比較
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * セキュリティヘッダーの設定
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://wpwqxhyiglbtlaimrjrx.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  }
}

const validationUtils = {
  validateApiKeyFormat,
  validateUrl,
  sanitizeSqlInput,
  escapeHtml,
  sanitizeFilePath,
  buildSecureUrl,
  getRateLimitKey,
  getClientIp,
  generateSecureToken,
  timingSafeEqual,
  getSecurityHeaders,
  ApiKeySchema,
  CompanySearchSchema,
  AuthSchema
}

export default validationUtils;