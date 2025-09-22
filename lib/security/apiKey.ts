import crypto from 'crypto'
import bcrypt from 'bcrypt'

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

export function generateApiKey(size = 43): string {
  // 長い形式専用: xbrl_live_v1_UUID_SECRET
  const uuid = crypto.randomUUID()

  // バイアスのない乱数生成のために、rejection sampling を使用
  const chars: string[] = []
  let bytesNeeded = size
  const maxValidByte = Math.floor(256 / BASE62.length) * BASE62.length - 1

  while (chars.length < size) {
    const bytes = crypto.randomBytes(bytesNeeded * 2) // 多めに生成して効率化
    for (const byte of bytes) {
      if (byte <= maxValidByte) {
        chars.push(BASE62[byte % BASE62.length])
        if (chars.length >= size) break
      }
    }
    bytesNeeded = size - chars.length
  }

  return `xbrl_live_v1_${uuid}_${chars.slice(0, size).join('')}`
}

export function hashApiKey(apiKey: string): string {
  // Use bcrypt to hash API key with generated salt
  // Cost factor of 12 is considered secure; can be adjusted via env/config if desired
  const saltRounds = 12;
  return bcrypt.hashSync(apiKey, saltRounds);
}

export function maskApiKey(apiKey: string): string {
  // 長い形式専用のマスキング: xbrl_live_v1_c949****************************Jlfs
  if (!apiKey || apiKey.length < 12) return apiKey
  const lastUnderscoreIndex = apiKey.lastIndexOf('_')
  if (lastUnderscoreIndex <= 0) return apiKey

  const prefix = apiKey.slice(0, lastUnderscoreIndex + 5) // プリフィックス + シークレットの最初の4文字
  const suffix = apiKey.slice(-4)
  const maskedLength = apiKey.length - prefix.length - suffix.length
  const masking = '*'.repeat(maskedLength)

  return `${prefix}${masking}${suffix}`
}

export function extractApiKeyPrefix(apiKey: string): string {
  // 長い形式専用: xbrl_live_v1_UUID_SECRET から prefix を抽出
  const lastUnderscoreIndex = apiKey.lastIndexOf('_')
  if (lastUnderscoreIndex <= 0) return apiKey
  return apiKey.slice(0, lastUnderscoreIndex)
}

export function extractApiKeySuffix(apiKey: string): string {
  return apiKey.slice(-4)
}
