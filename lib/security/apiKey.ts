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

const rawSecret =
  process.env.KEY_DERIVE_SECRET ??
  process.env.KEY_PEPPER ??
  process.env.API_KEY_SECRET

if (!rawSecret) {
  throw new Error('KEY_DERIVE_SECRET (or KEY_PEPPER/API_KEY_SECRET) must be set for API key hashing')
}

const HMAC_SECRET = decodeSecret(rawSecret)

export function generateApiKey(prefix = 'xbrl_live', size = 32): string {
  const bytes = crypto.randomBytes(size)
  const chars = Array.from(bytes).map((b) => BASE62[b % BASE62.length]).join('')
  return `${prefix}_${chars}`
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(apiKey).digest('hex')
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
