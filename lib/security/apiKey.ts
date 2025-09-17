import crypto from 'crypto'

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function decodeSecret(raw: string): Buffer {
  const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/
  if (base64Pattern.test(raw) && raw.length % 4 === 0) {
    try {
      const decoded = Buffer.from(raw, 'base64')
      if (decoded.toString('base64').replace(/=+$/, '') === raw.replace(/=+$/, '')) {
        return decoded
      }
    } catch {
      // fall through to utf-8
    }
  }
  return Buffer.from(raw, 'utf-8')
}

// Lazy initialization of HMAC_SECRET to avoid build-time errors
let HMAC_SECRET: Buffer | null = null

function getHmacSecret(): Buffer {
  if (HMAC_SECRET) return HMAC_SECRET

  const rawSecret =
    process.env.KEY_DERIVE_SECRET ??
    process.env.KEY_PEPPER ??
    process.env.API_KEY_SECRET

  if (!rawSecret) {
    throw new Error('KEY_DERIVE_SECRET (or KEY_PEPPER/API_KEY_SECRET) must be set for API key hashing')
  }

  HMAC_SECRET = decodeSecret(rawSecret)
  return HMAC_SECRET
}

export function generateApiKey(prefix = 'xbrl_live', size = 32): string {
  const bytes = crypto.randomBytes(size)
  const chars = Array.from(bytes).map((b) => BASE62[b % BASE62.length]).join('')
  return `${prefix}_${chars}`
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHmac('sha256', getHmacSecret()).update(apiKey).digest('hex')
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) return apiKey
  const parts = apiKey.split('_')
  const prefix = parts.length > 1 ? parts.slice(0, 2).join('_') : apiKey.slice(0, 8)
  const suffix = apiKey.slice(-4)
  return `${prefix}...${suffix}`
}

export function extractApiKeyPrefix(apiKey: string): string {
  const parts = apiKey.split('_')
  return parts.length >= 2 ? `${parts[0]}_${parts[1]}` : parts[0]
}

export function extractApiKeySuffix(apiKey: string): string {
  return apiKey.slice(-4)
}

export type ApiKeyTier = 'free' | 'basic' | 'premium'

export interface RateLimitConfig {
  perMinute: number
  perHour: number
  perDay: number
}

const RATE_LIMITS_BY_TIER: Record<ApiKeyTier, RateLimitConfig> = {
  free: { perMinute: 100, perHour: 2000, perDay: 50000 },
  basic: { perMinute: 300, perHour: 5000, perDay: 100000 },
  premium: { perMinute: 600, perHour: 10000, perDay: 200000 },
}

export function normalizeTier(tier?: string | null): ApiKeyTier {
  if (!tier) return 'free'

  const normalized = tier.toLowerCase()

  if (['basic'].includes(normalized)) {
    return 'basic'
  }

  if (['premium', 'pro', 'standard', 'enterprise'].includes(normalized)) {
    return 'premium'
  }

  return 'free'
}

export function resolveTierLimits(tier?: string | null) {
  const normalized = normalizeTier(tier)
  return {
    tier: normalized,
    limits: RATE_LIMITS_BY_TIER[normalized],
  }
}

export function deriveApiKeyMetadata(apiKey: string) {
  return {
    hash: hashApiKey(apiKey),
    prefix: extractApiKeyPrefix(apiKey),
    suffix: extractApiKeySuffix(apiKey),
    masked: maskApiKey(apiKey),
  }
}
