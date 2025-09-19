/**
 * Environment Variable Encryption System
 * GitHub Security Alert #80 - 環境変数の暗号化保護
 * CWE-312: Cleartext Storage of Sensitive Information
 */

import { EncryptionManager } from './encryption-manager'
import fs from 'fs'
import path from 'path'

interface EncryptedEnvFile {
  version: string
  encrypted: boolean
  algorithm: string
  data: Record<string, string>
  metadata: {
    encryptedAt: string
    encryptedBy: string
    environment: string
  }
}

interface EnvValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

export class EnvEncryption {
  private static readonly VERSION = '1.0.0'
  private static readonly ENV_FILE = '.env'
  private static readonly ENV_ENCRYPTED_FILE = '.env.encrypted'
  private static readonly ENV_SCHEMA_FILE = '.env.schema'

  // センシティブな環境変数パターン
  private static readonly SENSITIVE_ENV_PATTERNS = [
    /^.+_(KEY|SECRET|PASSWORD|TOKEN|CREDENTIAL|PRIVATE|AUTH)$/,
    /^(KEY|SECRET|PASSWORD|TOKEN|CREDENTIAL|PRIVATE|AUTH)_.+$/,
    /^DATABASE_URL$/,
    /^REDIS_URL$/,
    /^MONGODB_URI$/,
    /^JWT_SECRET$/,
    /^SESSION_SECRET$/,
    /^ENCRYPTION_KEY$/,
    /^API_KEY$/,
    /^STRIPE_.+$/,
    /^AWS_.+$/,
    /^GITHUB_.+$/,
    /^SUPABASE_.+_KEY$/
  ]

  // 公開可能な環境変数パターン
  private static readonly PUBLIC_ENV_PATTERNS = [
    /^NEXT_PUBLIC_.+$/,
    /^PUBLIC_.+$/,
    /^REACT_APP_.+$/,
    /^VUE_APP_.+$/,
    /^NODE_ENV$/,
    /^PORT$/,
    /^HOST$/
  ]

  /**
   * .envファイルの内容をパース（dotenv.parseの代替）
   */
  private static parseEnvContent(content: string): Record<string, string> {
    const result: Record<string, string> = {}
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      // コメント行や空行をスキップ
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      // KEY=VALUE の形式を解析
      const equalIndex = trimmed.indexOf('=')
      if (equalIndex === -1) {
        continue
      }

      const key = trimmed.substring(0, equalIndex).trim()
      let value = trimmed.substring(equalIndex + 1).trim()

      // クォートを除去
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      result[key] = value
    }

    return result
  }

  /**
   * .envファイルを暗号化
   */
  static async encryptEnvFile(
    password?: string,
    envPath: string = this.ENV_FILE
  ): Promise<void> {
    const encryptionKey = password || process.env.ENV_ENCRYPTION_KEY ||
                         EncryptionManager.generateSecurePassword(32)

    // .envファイルを読み込み
    const envFilePath = path.resolve(process.cwd(), envPath)

    if (!fs.existsSync(envFilePath)) {
      throw new Error(`Environment file not found: ${envPath}`)
    }

    const envContent = fs.readFileSync(envFilePath, 'utf8')
    const envVars = this.parseEnvContent(envContent)

    // 暗号化が必要な変数を識別
    const encryptedData: Record<string, string> = {}
    const publicData: Record<string, string> = {}

    for (const [key, value] of Object.entries(envVars)) {
      if (this.isSensitiveEnvVar(key)) {
        // センシティブな変数は暗号化
        const encrypted = EncryptionManager.encrypt(value, encryptionKey)
        encryptedData[key] = Buffer.from(JSON.stringify(encrypted)).toString('base64')

        console.log(`🔒 Encrypting: ${key}`)
      } else if (this.isPublicEnvVar(key)) {
        // 公開変数はそのまま
        publicData[key] = value
        console.log(`📢 Public: ${key}`)
      } else {
        // 不明な変数は警告して暗号化
        console.warn(`⚠️ Unknown variable (encrypting): ${key}`)
        const encrypted = EncryptionManager.encrypt(value, encryptionKey)
        encryptedData[key] = Buffer.from(JSON.stringify(encrypted)).toString('base64')
      }
    }

    // 暗号化ファイルを作成
    const encryptedEnv: EncryptedEnvFile = {
      version: this.VERSION,
      encrypted: true,
      algorithm: 'aes-256-gcm',
      data: { ...publicData, ...encryptedData },
      metadata: {
        encryptedAt: new Date().toISOString(),
        encryptedBy: process.env.USER || 'unknown',
        environment: process.env.NODE_ENV || 'development'
      }
    }

    // 暗号化ファイルを保存
    const encryptedPath = path.resolve(process.cwd(), this.ENV_ENCRYPTED_FILE)
    fs.writeFileSync(
      encryptedPath,
      JSON.stringify(encryptedEnv, null, 2),
      { mode: 0o600 }
    )

    // 暗号化キーを保存（初回のみ）
    if (!password && !process.env.ENV_ENCRYPTION_KEY) {
      this.saveEncryptionKey(encryptionKey)
    }

    console.log('✅ Environment variables encrypted successfully')
    console.log(`📁 Encrypted file: ${this.ENV_ENCRYPTED_FILE}`)

    // セキュリティ警告
    console.warn('\n⚠️ Security Recommendations:')
    console.warn('1. Add .env to .gitignore')
    console.warn('2. Store encryption key securely')
    console.warn('3. Rotate encryption keys regularly')
    console.warn('4. Use different keys for each environment')
  }

  /**
   * 環境変数のバリデーション
   */
  static validateEnvVars(): EnvValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // 必須環境変数のチェック
    const required = [
      'NODE_ENV',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]

    for (const key of required) {
      if (!process.env[key]) {
        errors.push(`Missing required environment variable: ${key}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * センシティブな環境変数かチェック
   */
  private static isSensitiveEnvVar(key: string): boolean {
    return this.SENSITIVE_ENV_PATTERNS.some(pattern => pattern.test(key))
  }

  /**
   * 公開可能な環境変数かチェック
   */
  private static isPublicEnvVar(key: string): boolean {
    return this.PUBLIC_ENV_PATTERNS.some(pattern => pattern.test(key))
  }

  /**
   * 暗号化キーを保存
   */
  private static saveEncryptionKey(key: string): void {
    const keyPath = path.resolve(process.cwd(), '.env.key')

    fs.writeFileSync(keyPath, key, {
      encoding: 'utf8',
      mode: 0o600
    })

    console.log('🔑 Encryption key saved to .env.key')
    console.warn('⚠️ Keep this key secure and never commit it to version control')
  }
}

export type { EncryptedEnvFile, EnvValidationResult }