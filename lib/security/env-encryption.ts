/**
 * Environment Variable Encryption System
 * GitHub Security Alert #80 - 環境変数の暗号化保護
 * CWE-312: Cleartext Storage of Sensitive Information
 */

import { EncryptionManager } from './encryption-manager'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

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
    const envVars = dotenv.parse(envContent)

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

    // 元の.envファイルをバックアップ
    const backupPath = `${envFilePath}.backup.${Date.now()}`
    fs.copyFileSync(envFilePath, backupPath)

    console.log('✅ Environment variables encrypted successfully')
    console.log(`📁 Encrypted file: ${this.ENV_ENCRYPTED_FILE}`)
    console.log(`💾 Backup created: ${backupPath}`)

    // セキュリティ警告
    console.warn('\n⚠️ Security Recommendations:')
    console.warn('1. Add .env to .gitignore')
    console.warn('2. Store encryption key securely')
    console.warn('3. Rotate encryption keys regularly')
    console.warn('4. Use different keys for each environment')
  }

  /**
   * 暗号化された.envファイルを復号化
   */
  static async decryptEnvFile(
    password?: string,
    encryptedPath: string = this.ENV_ENCRYPTED_FILE
  ): Promise<Record<string, string>> {
    const encryptionKey = password || process.env.ENV_ENCRYPTION_KEY ||
                         this.loadEncryptionKey()

    if (!encryptionKey) {
      throw new Error('Encryption key not found')
    }

    // 暗号化ファイルを読み込み
    const encryptedFilePath = path.resolve(process.cwd(), encryptedPath)

    if (!fs.existsSync(encryptedFilePath)) {
      throw new Error(`Encrypted file not found: ${encryptedPath}`)
    }

    const encryptedContent = fs.readFileSync(encryptedFilePath, 'utf8')
    const encryptedEnv: EncryptedEnvFile = JSON.parse(encryptedContent)

    // バージョンチェック
    if (encryptedEnv.version !== this.VERSION) {
      console.warn(`Version mismatch: expected ${this.VERSION}, got ${encryptedEnv.version}`)
    }

    // 復号化
    const decryptedVars: Record<string, string> = {}

    for (const [key, value] of Object.entries(encryptedEnv.data)) {
      if (this.isSensitiveEnvVar(key) || !this.isPublicEnvVar(key)) {
        try {
          // 暗号化された値を復号化
          const encryptedData = JSON.parse(
            Buffer.from(value, 'base64').toString('utf8')
          )
          const decrypted = EncryptionManager.decrypt(encryptedData, encryptionKey)
          decryptedVars[key] = decrypted.data
        } catch (error) {
          // 復号化に失敗した場合は平文として扱う（公開変数）
          decryptedVars[key] = value
        }
      } else {
        // 公開変数はそのまま
        decryptedVars[key] = value
      }
    }

    return decryptedVars
  }

  /**
   * 環境変数をプロセスにロード
   */
  static async loadEncryptedEnv(
    password?: string,
    encryptedPath: string = this.ENV_ENCRYPTED_FILE
  ): Promise<void> {
    const decryptedVars = await this.decryptEnvFile(password, encryptedPath)

    // プロセスの環境変数に設定
    for (const [key, value] of Object.entries(decryptedVars)) {
      process.env[key] = value
    }

    console.log('✅ Encrypted environment variables loaded successfully')
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

    // センシティブな変数の検証
    for (const [key, value] of Object.entries(process.env)) {
      if (!value) continue

      // 平文パスワードの検出
      if (key.includes('PASSWORD') && value.length < 12) {
        warnings.push(`Weak password detected: ${key} (less than 12 characters)`)
      }

      // ハードコードされた認証情報の検出
      if (value.includes('password123') || value.includes('admin')) {
        errors.push(`Hardcoded credential detected: ${key}`)
      }

      // Base64エンコードされた認証情報の検出
      if (this.isSensitiveEnvVar(key) && !this.isEncrypted(value)) {
        warnings.push(`Unencrypted sensitive variable: ${key}`)
        suggestions.push(`Consider encrypting: ${key}`)
      }

      // 本番環境での開発用変数
      if (process.env.NODE_ENV === 'production') {
        if (key.includes('DEBUG') || key.includes('DEV')) {
          warnings.push(`Development variable in production: ${key}`)
        }
      }
    }

    // セキュリティ推奨事項
    if (!process.env.ENV_ENCRYPTION_KEY) {
      suggestions.push('Set ENV_ENCRYPTION_KEY for environment variable encryption')
    }

    if (!process.env.API_KEY_SECRET) {
      suggestions.push('Set API_KEY_SECRET for API key hashing')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * 環境変数スキーマを生成
   */
  static generateEnvSchema(): void {
    const schema: Record<string, any> = {}

    for (const [key, value] of Object.entries(process.env)) {
      if (!value) continue

      schema[key] = {
        type: this.detectType(value),
        required: true,
        sensitive: this.isSensitiveEnvVar(key),
        public: this.isPublicEnvVar(key),
        example: this.generateExample(key, value),
        description: this.generateDescription(key)
      }
    }

    // スキーマファイルを保存
    const schemaPath = path.resolve(process.cwd(), this.ENV_SCHEMA_FILE)
    fs.writeFileSync(
      schemaPath,
      JSON.stringify(schema, null, 2)
    )

    console.log(`✅ Environment schema generated: ${this.ENV_SCHEMA_FILE}`)
  }

  /**
   * .env.exampleファイルを生成
   */
  static generateEnvExample(): void {
    let exampleContent = '# Environment Variables Example\n'
    exampleContent += '# Copy this file to .env and fill in the values\n\n'

    const categorized: Record<string, string[]> = {
      'Database': [],
      'Authentication': [],
      'API Keys': [],
      'Application': [],
      'Other': []
    }

    for (const key of Object.keys(process.env)) {
      const category = this.categorizeEnvVar(key)
      const example = this.generateExample(key, process.env[key]!)
      categorized[category].push(`${key}=${example}`)
    }

    for (const [category, vars] of Object.entries(categorized)) {
      if (vars.length > 0) {
        exampleContent += `# ${category}\n`
        exampleContent += vars.join('\n') + '\n\n'
      }
    }

    // .env.exampleファイルを保存
    const examplePath = path.resolve(process.cwd(), '.env.example')
    fs.writeFileSync(examplePath, exampleContent)

    console.log('✅ Environment example generated: .env.example')
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
   * 値が暗号化されているかチェック
   */
  private static isEncrypted(value: string): boolean {
    try {
      const decoded = Buffer.from(value, 'base64').toString('utf8')
      const parsed = JSON.parse(decoded)
      return parsed.encrypted && parsed.iv && parsed.salt && parsed.tag
    } catch {
      return false
    }
  }

  /**
   * 値の型を検出
   */
  private static detectType(value: string): string {
    if (value === 'true' || value === 'false') return 'boolean'
    if (!isNaN(Number(value))) return 'number'
    if (value.startsWith('http://') || value.startsWith('https://')) return 'url'
    if (value.includes('@')) return 'email'
    return 'string'
  }

  /**
   * サンプル値を生成
   */
  private static generateExample(key: string, value: string): string {
    if (this.isSensitiveEnvVar(key)) {
      if (key.includes('KEY')) return 'your-secret-key-here'
      if (key.includes('PASSWORD')) return 'your-password-here'
      if (key.includes('TOKEN')) return 'your-token-here'
      if (key.includes('SECRET')) return 'your-secret-here'
      return 'your-value-here'
    }

    if (key === 'NODE_ENV') return 'development'
    if (key === 'PORT') return '3000'
    if (key.includes('URL')) return 'https://example.com'

    // 公開変数は実際の値を例として使用（マスク処理）
    if (this.isPublicEnvVar(key) && value) {
      if (value.length > 20) {
        return value.substring(0, 10) + '...'
      }
      return value
    }

    return 'your-value-here'
  }

  /**
   * 環境変数の説明を生成
   */
  private static generateDescription(key: string): string {
    const descriptions: Record<string, string> = {
      NODE_ENV: 'Application environment (development/staging/production)',
      PORT: 'Server port number',
      DATABASE_URL: 'Database connection string',
      NEXT_PUBLIC_SUPABASE_URL: 'Supabase project URL',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Supabase anonymous key',
      SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role key (server-side only)',
      JWT_SECRET: 'Secret key for JWT token signing',
      SESSION_SECRET: 'Secret key for session encryption',
      API_KEY_SECRET: 'Secret key for API key hashing',
      ENV_ENCRYPTION_KEY: 'Master key for environment variable encryption'
    }

    return descriptions[key] || `Configuration for ${key}`
  }

  /**
   * 環境変数をカテゴリ分類
   */
  private static categorizeEnvVar(key: string): string {
    if (key.includes('DATABASE') || key.includes('DB_')) return 'Database'
    if (key.includes('AUTH') || key.includes('JWT') || key.includes('SESSION')) return 'Authentication'
    if (key.includes('API') || key.includes('KEY') || key.includes('TOKEN')) return 'API Keys'
    if (key.includes('NEXT_PUBLIC') || key === 'NODE_ENV' || key === 'PORT') return 'Application'
    return 'Other'
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

    // .gitignoreに追加
    const gitignorePath = path.resolve(process.cwd(), '.gitignore')

    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8')

      if (!content.includes('.env.key')) {
        fs.appendFileSync(
          gitignorePath,
          '\n# Environment encryption key\n.env.key\n'
        )
      }
    }

    console.log('🔑 Encryption key saved to .env.key')
    console.warn('⚠️ Keep this key secure and never commit it to version control')
  }

  /**
   * 暗号化キーをロード
   */
  private static loadEncryptionKey(): string | null {
    const keyPath = path.resolve(process.cwd(), '.env.key')

    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath, 'utf8').trim()
    }

    return null
  }
}

// CLIコマンド用エクスポート
if (require.main === module) {
  const command = process.argv[2]

  switch (command) {
    case 'encrypt':
      EnvEncryption.encryptEnvFile()
      break
    case 'decrypt':
      EnvEncryption.decryptEnvFile().then(vars => {
        console.log('Decrypted variables:', Object.keys(vars))
      })
      break
    case 'load':
      EnvEncryption.loadEncryptedEnv()
      break
    case 'validate':
      const result = EnvEncryption.validateEnvVars()
      console.log('Validation result:', result)
      break
    case 'schema':
      EnvEncryption.generateEnvSchema()
      break
    case 'example':
      EnvEncryption.generateEnvExample()
      break
    default:
      console.log('Usage: node env-encryption.js [encrypt|decrypt|load|validate|schema|example]')
  }
}

export type { EncryptedEnvFile, EnvValidationResult }