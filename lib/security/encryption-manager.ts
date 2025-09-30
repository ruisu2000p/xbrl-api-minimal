/**
 * Encryption Manager for Sensitive Data Protection
 * GitHub Security Alert #80 - Clear Text Storage対策
 * CWE-312: Cleartext Storage of Sensitive Information
 */

import crypto from 'crypto'

interface EncryptionOptions {
  algorithm?: string
  saltLength?: number
  tagLength?: number
  iterations?: number
  keyLength?: number
}

interface EncryptedData {
  encrypted: string
  iv: string
  salt: string
  tag: string
  algorithm: string
  timestamp: string
  version: string
}

interface DecryptedResult {
  data: string
  metadata: {
    encryptedAt: string
    algorithm: string
    version: string
  }
}

export class EncryptionManager {
  private static readonly VERSION = '1.0.0'
  private static readonly DEFAULT_ALGORITHM = 'aes-256-gcm'
  private static readonly SALT_LENGTH = 32
  private static readonly IV_LENGTH = 16
  private static readonly TAG_LENGTH = 16
  private static readonly ITERATIONS = 100000
  private static readonly KEY_LENGTH = 32

  // メモリ内のキーキャッシュ（パフォーマンス向上）
  private static keyCache = new Map<string, Buffer>()
  private static readonly MAX_CACHE_SIZE = 100
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5分

  /**
   * データを暗号化
   */
  static async encrypt(
    data: string,
    password: string,
    options: EncryptionOptions = {}
  ): Promise<EncryptedData> {
    const {
      algorithm = this.DEFAULT_ALGORITHM,
      saltLength = this.SALT_LENGTH,
      tagLength = this.TAG_LENGTH,
      iterations = this.ITERATIONS,
      keyLength = this.KEY_LENGTH
    } = options

    // 入力検証
    if (!data || typeof data !== 'string') {
      throw new Error('Invalid data: must be a non-empty string')
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      throw new Error('Invalid password: must be at least 8 characters')
    }

    // Salt と IV の生成
    const salt = crypto.randomBytes(saltLength)
    const iv = crypto.randomBytes(this.IV_LENGTH)

    // キー導出
    const key = await this.deriveKey(password, salt, iterations, keyLength)

    // 暗号化
    const cipher = crypto.createCipheriv(algorithm, Uint8Array.from(key), Uint8Array.from(iv))

    let encrypted = cipher.update(data, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    // 認証タグを取得（GCMモード）
    const tag = (cipher as any).getAuthTag()

    // セキュアなメモリクリア
    key.fill(0)

    return {
      encrypted,
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
      tag: tag.toString('base64'),
      algorithm,
      timestamp: new Date().toISOString(),
      version: this.VERSION
    }
  }

  /**
   * データを復号化
   */
  static async decrypt(
    encryptedData: EncryptedData,
    password: string
  ): Promise<DecryptedResult> {
    // 入力検証
    if (!encryptedData || !encryptedData.encrypted) {
      throw new Error('Invalid encrypted data')
    }

    if (!password || typeof password !== 'string') {
      throw new Error('Invalid password')
    }

    // バージョンチェック
    if (encryptedData.version !== this.VERSION) {
      console.warn(`Version mismatch: expected ${this.VERSION}, got ${encryptedData.version}`)
    }

    const {
      encrypted,
      iv,
      salt,
      tag,
      algorithm,
      timestamp
    } = encryptedData

    // Base64デコード
    const ivBuffer = Buffer.from(iv, 'base64')
    const saltBuffer = Buffer.from(salt, 'base64')
    const tagBuffer = Buffer.from(tag, 'base64')

    // キー導出
    const key = await this.deriveKey(
      password,
      saltBuffer,
      this.ITERATIONS,
      this.KEY_LENGTH
    )

    try {
      // 復号化
      const decipher: crypto.DecipherGCM = crypto.createDecipheriv(algorithm, Uint8Array.from(key), Uint8Array.from(ivBuffer)) as crypto.DecipherGCM

      // 認証タグを設定（GCMモード）
      decipher.setAuthTag(Uint8Array.from(tagBuffer))

      let decrypted = decipher.update(encrypted, 'base64', 'utf8')
      decrypted += decipher.final('utf8')

      return {
        data: decrypted,
        metadata: {
          encryptedAt: timestamp,
          algorithm,
          version: encryptedData.version
        }
      }
    } catch (error) {
      throw new Error('Decryption failed: Invalid password or corrupted data')
    } finally {
      // セキュアなメモリクリア
      key.fill(0)
    }
  }

  /**
   * 環境変数を暗号化
   */
  static async encryptEnvVar(
    value: string,
    envKey: string = 'ENCRYPTION_KEY'
  ): Promise<string> {
    const password = process.env[envKey]

    if (!password) {
      throw new Error(`Environment variable ${envKey} not set`)
    }

    const encrypted = await this.encrypt(value, password)

    // コンパクトな形式で保存
    return Buffer.from(JSON.stringify(encrypted)).toString('base64')
  }

  /**
   * 環境変数を復号化
   */
  static async decryptEnvVar(
    encryptedValue: string,
    envKey: string = 'ENCRYPTION_KEY'
  ): Promise<string> {
    const password = process.env[envKey]

    if (!password) {
      throw new Error(`Environment variable ${envKey} not set`)
    }

    try {
      const encryptedData = JSON.parse(
        Buffer.from(encryptedValue, 'base64').toString('utf8')
      )

      const result = await this.decrypt(encryptedData, password)
      return result.data
    } catch (error) {
      throw new Error('Failed to decrypt environment variable')
    }
  }

  /**
   * JSONオブジェクトを暗号化
   */
  static async encryptJSON<T extends object>(
    obj: T,
    password: string
  ): Promise<EncryptedData> {
    const jsonString = JSON.stringify(obj)
    return await this.encrypt(jsonString, password)
  }

  /**
   * JSONオブジェクトを復号化
   */
  static async decryptJSON<T extends object>(
    encryptedData: EncryptedData,
    password: string
  ): Promise<T> {
    const result = await this.decrypt(encryptedData, password)

    try {
      return JSON.parse(result.data)
    } catch (error) {
      throw new Error('Failed to parse decrypted JSON')
    }
  }

  /**
   * ファイルを暗号化
   */
  static async encryptFile(
    filePath: string,
    password: string,
    outputPath?: string
  ): Promise<string> {
    const fs = await import('fs/promises')
    const path = await import('path')

    const data = await fs.readFile(filePath, 'utf8')
    const encrypted = await this.encrypt(data, password)

    const output = outputPath || `${filePath}.enc`
    await fs.writeFile(output, JSON.stringify(encrypted, null, 2))

    return output
  }

  /**
   * ファイルを復号化
   */
  static async decryptFile(
    encryptedFilePath: string,
    password: string,
    outputPath?: string
  ): Promise<string> {
    const fs = await import('fs/promises')
    const path = await import('path')

    const encryptedContent = await fs.readFile(encryptedFilePath, 'utf8')
    const encryptedData = JSON.parse(encryptedContent)

    const result = await this.decrypt(encryptedData, password)

    const output = outputPath || encryptedFilePath.replace('.enc', '')
    await fs.writeFile(output, result.data)

    return output
  }

  /**
   * パスワードからキーを導出（PBKDF2）
   */
  private static async deriveKey(
    password: string,
    salt: Buffer,
    iterations: number,
    keyLength: number
  ): Promise<Buffer> {
    const cacheKey = `${password}-${salt.toString('base64')}`

    // キャッシュチェック
    if (this.keyCache.has(cacheKey)) {
      const cached = this.keyCache.get(cacheKey)!
      return Buffer.from(cached.buffer || cached)
    }

    // キー導出
    const key = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(password, Uint8Array.from(salt), iterations, keyLength, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });

    // キャッシュに保存（サイズ制限付き）
    if (this.keyCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.keyCache.keys().next().value
      if (firstKey !== undefined) { this.keyCache.delete(firstKey) }
    }

    this.keyCache.set(cacheKey, key)

    // TTL後にキャッシュから削除
    setTimeout(() => {
      this.keyCache.delete(cacheKey)
    }, this.CACHE_TTL)

    return key
  }

  /**
   * セキュアなランダムパスワード生成
   */
  static generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
    const randomBytes = crypto.randomBytes(length)
    let password = ''

    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length]
    }

    return password
  }

  /**
   * データのハッシュ化（検証用）
   */
  static hash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex')
  }

  /**
   * タイミング安全な比較
   */
  static timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    const bufferA = Buffer.from(a)
    const bufferB = Buffer.from(b)

    return crypto.timingSafeEqual(Uint8Array.from(bufferA), Uint8Array.from(bufferB))
  }

  /**
   * メモリキャッシュをクリア
   */
  static clearCache(): void {
    this.keyCache.clear()
  }
}

// エクスポート
export type { EncryptedData, DecryptedResult, EncryptionOptions }