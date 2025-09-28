/**
 * Async Crypto Utilities
 * 非同期暗号化ユーティリティ
 *
 * Node.js の crypto モジュールの非同期版実装
 * Event Loop のブロッキングを防ぐ
 */

import {
  randomBytes,
  pbkdf2,
  createCipheriv,
  createDecipheriv,
  createHash,
  timingSafeEqual,
} from 'crypto'
import { promisify } from 'util'

// 非同期化
const randomBytesAsync = promisify(randomBytes)
const pbkdf2Async = promisify(pbkdf2)

/**
 * セキュアなランダムバイト生成（非同期）
 */
export async function generateRandomBytes(length: number): Promise<Buffer> {
  return randomBytesAsync(length)
}

/**
 * セキュアなランダムトークン生成（非同期）
 */
export async function generateSecureToken(length: number = 32): Promise<string> {
  const buffer = await generateRandomBytes(length)
  return buffer.toString('base64url')
}

/**
 * PBKDF2ハッシュ生成（非同期）
 */
export async function hashWithPBKDF2(
  password: string,
  salt: string | Buffer,
  iterations: number = 100000,
  keyLength: number = 32,
  digest: string = 'sha256'
): Promise<Buffer> {
  return pbkdf2Async(password, salt, iterations, keyLength, digest)
}

/**
 * SHA256ハッシュ生成（ストリーム対応）
 */
export async function hashWithSHA256(data: string | Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const hash = createHash('sha256')
      hash.update(data)
      resolve(hash.digest('hex'))
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * AES-256-GCM暗号化（非同期）
 */
export async function encryptAES256GCM(
  plaintext: string,
  key: Buffer
): Promise<{
  encrypted: string
  iv: string
  authTag: string
}> {
  try {
    const iv = await generateRandomBytes(16)
    const cipher = createCipheriv('aes-256-gcm', key, iv)

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ])

    const authTag = cipher.getAuthTag()

    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    }
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`)
  }
}

/**
 * AES-256-GCM復号化（非同期）
 */
export async function decryptAES256GCM(
  encryptedData: string,
  key: Buffer,
  iv: string,
  authTag: string
): Promise<string> {
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(iv, 'base64')
    )

    decipher.setAuthTag(Buffer.from(authTag, 'base64'))

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData, 'base64')),
      decipher.final(),
    ])

    return decrypted.toString('utf8')
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`)
  }
}

/**
 * タイミング攻撃耐性のあるバッファ比較
 */
export function secureCompare(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false
  }
  return timingSafeEqual(a, b)
}

/**
 * タイミング攻撃耐性のある文字列比較
 */
export function secureStringCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  return secureCompare(Buffer.from(a), Buffer.from(b))
}

/**
 * パスワード強度チェック（非同期）
 */
export async function checkPasswordStrength(password: string): Promise<{
  score: number
  feedback: string[]
}> {
  return new Promise((resolve) => {
    // Web Workers や別プロセスで実行することも考慮
    setImmediate(() => {
      const feedback: string[] = []
      let score = 0

      // 長さチェック
      if (password.length >= 8) score++
      if (password.length >= 12) score++
      if (password.length >= 16) score++
      else feedback.push('パスワードは12文字以上を推奨します')

      // 文字種チェック
      if (/[a-z]/.test(password)) score++
      else feedback.push('小文字を含めてください')

      if (/[A-Z]/.test(password)) score++
      else feedback.push('大文字を含めてください')

      if (/[0-9]/.test(password)) score++
      else feedback.push('数字を含めてください')

      if (/[^a-zA-Z0-9]/.test(password)) score++
      else feedback.push('記号を含めてください')

      // 一般的なパターンのチェック
      if (/(.)\1{2,}/.test(password)) {
        score--
        feedback.push('同じ文字の連続を避けてください')
      }

      if (/^(password|12345|qwerty)/i.test(password)) {
        score -= 2
        feedback.push('一般的なパスワードは避けてください')
      }

      resolve({
        score: Math.max(0, Math.min(10, score)),
        feedback,
      })
    })
  })
}

/**
 * セキュアなソルト生成（非同期）
 */
export async function generateSalt(length: number = 32): Promise<string> {
  const salt = await generateRandomBytes(length)
  return salt.toString('hex')
}

/**
 * パスワードのハッシュ化（非同期、ソルト付き）
 */
export async function hashPassword(
  password: string,
  salt?: string
): Promise<{
  hash: string
  salt: string
}> {
  const actualSalt = salt || (await generateSalt())
  const hash = await hashWithPBKDF2(password, actualSalt, 100000, 32, 'sha256')

  return {
    hash: hash.toString('hex'),
    salt: actualSalt,
  }
}

/**
 * パスワード検証（非同期）
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const computedHash = await hashWithPBKDF2(password, salt, 100000, 32, 'sha256')
  return secureStringCompare(computedHash.toString('hex'), hash)
}

/**
 * JWT風のトークン生成（簡易版、非同期）
 */
export async function generateToken(
  payload: Record<string, any>,
  secret: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')

  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const signature = await hashWithSHA256(signatureInput + secret)

  return `${signatureInput}.${Buffer.from(signature).toString('base64url')}`
}

/**
 * レート制限用のトークンバケット（非同期）
 */
export class AsyncRateLimiter {
  private tokens: number
  private maxTokens: number
  private refillRate: number // tokens per second
  private lastRefill: number

  constructor(maxTokens: number = 10, refillRate: number = 1) {
    this.maxTokens = maxTokens
    this.tokens = maxTokens
    this.refillRate = refillRate
    this.lastRefill = Date.now()
  }

  async consume(tokens: number = 1): Promise<boolean> {
    return new Promise((resolve) => {
      setImmediate(() => {
        const now = Date.now()
        const elapsed = (now - this.lastRefill) / 1000
        const tokensToAdd = elapsed * this.refillRate

        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
        this.lastRefill = now

        if (this.tokens >= tokens) {
          this.tokens -= tokens
          resolve(true)
        } else {
          resolve(false)
        }
      })
    })
  }

  async reset(): Promise<void> {
    return new Promise((resolve) => {
      setImmediate(() => {
        this.tokens = this.maxTokens
        this.lastRefill = Date.now()
        resolve()
      })
    })
  }
}