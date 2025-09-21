/**
 * Secure Configuration Manager
 * GitHub Security Alert #80 - 暗号化された設定管理
 * CWE-312: Cleartext Storage of Sensitive Information
 */

import { EncryptionManager } from './encryption-manager'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

interface SecureConfig {
  [key: string]: any
}

interface ConfigMetadata {
  version: string
  createdAt: string
  updatedAt: string
  environment: string
  checksum: string
}

interface EncryptedConfig {
  data: string
  metadata: ConfigMetadata
  signature: string
}

export class SecureConfigManager {
  private static instance: SecureConfigManager | null = null
  private config: SecureConfig = {}
  private configPath: string
  private masterKey: string
  private isLoaded: boolean = false
  private readonly VERSION = '1.0.0'

  // センシティブなキーのパターン
  private static readonly SENSITIVE_PATTERNS = [
    /password/i,
    /secret/i,
    /key/i,
    /token/i,
    /credential/i,
    /auth/i,
    /api/i,
    /private/i,
    /cert/i,
    /salt/i
  ]

  // 設定値の型定義
  private static readonly CONFIG_TYPES = {
    DATABASE_URL: 'string',
    API_KEY: 'string',
    JWT_SECRET: 'string',
    ENCRYPTION_KEY: 'string',
    SMTP_PASSWORD: 'string',
    AWS_SECRET_KEY: 'string',
    PRIVATE_KEY: 'string',
    CLIENT_SECRET: 'string'
  } as const

  private constructor(configPath: string, masterKey?: string) {
    this.configPath = configPath
    this.masterKey = masterKey || this.getMasterKey()
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(configPath?: string, masterKey?: string): SecureConfigManager {
    if (!this.instance) {
      const defaultPath = path.join(process.cwd(), '.secure-config.enc')
      this.instance = new SecureConfigManager(
        configPath || defaultPath,
        masterKey
      )
    }
    return this.instance
  }

  /**
   * マスターキーを取得
   */
  private getMasterKey(): string {
    // 環境変数から取得
    const envKey = process.env.CONFIG_MASTER_KEY

    if (envKey) {
      return envKey
    }

    // ファイルから取得
    const keyPath = path.join(process.cwd(), '.master-key')

    if (fs.existsSync(keyPath)) {
      const key = fs.readFileSync(keyPath, 'utf8').trim()

      // キーファイルのパーミッションチェック
      const stats = fs.statSync(keyPath)
      const mode = (stats.mode & parseInt('777', 8)).toString(8)

      if (mode !== '600' && process.platform !== 'win32') {
        console.warn('⚠️ Master key file permissions are too open. Should be 600.')
      }

      return key
    }

    // 新規生成
    const newKey = EncryptionManager.generateSecurePassword(64)
    this.saveMasterKey(newKey)

    return newKey
  }

  /**
   * マスターキーを保存
   */
  private saveMasterKey(key: string): void {
    const keyPath = path.join(process.cwd(), '.master-key')

    fs.writeFileSync(keyPath, key, {
      encoding: 'utf8',
      mode: 0o600
    })

    // .gitignoreに追加
    const gitignorePath = path.join(process.cwd(), '.gitignore')

    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8')

      if (!content.includes('.master-key')) {
        fs.appendFileSync(gitignorePath, '\n# Secure config master key\n.master-key\n')
      }
    }
  }

  /**
   * 設定をロード
   */
  async load(): Promise<void> {
    if (!fs.existsSync(this.configPath)) {
      console.log('No encrypted config found. Starting with empty configuration.')
      this.config = {}
      this.isLoaded = true
      return
    }

    try {
      const encryptedContent = fs.readFileSync(this.configPath, 'utf8')
      const encryptedConfig: EncryptedConfig = JSON.parse(encryptedContent)

      // 署名検証
      if (!this.verifySignature(encryptedConfig)) {
        throw new Error('Config signature verification failed')
      }

      // 復号化
      const decrypted = EncryptionManager.decryptEnvVar(
        encryptedConfig.data,
        'CONFIG_MASTER_KEY'
      )

      this.config = JSON.parse(decrypted)

      // チェックサム検証
      const checksum = this.calculateChecksum(this.config)
      if (checksum !== encryptedConfig.metadata.checksum) {
        throw new Error('Config checksum verification failed')
      }

      this.isLoaded = true

      console.log('✅ Secure configuration loaded successfully')
    } catch (error) {
      console.error('❌ Failed to load secure config:', error)
      throw error
    }
  }

  /**
   * 設定を保存
   */
  async save(): Promise<void> {
    const metadata: ConfigMetadata = {
      version: this.VERSION,
      createdAt: this.config.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      checksum: this.calculateChecksum(this.config)
    }

    // 暗号化
    const encrypted = EncryptionManager.encryptEnvVar(
      JSON.stringify(this.config),
      'CONFIG_MASTER_KEY'
    )

    // 署名生成
    const signature = this.generateSignature(encrypted, metadata)

    const encryptedConfig: EncryptedConfig = {
      data: encrypted,
      metadata,
      signature
    }

    // ファイルに保存
    fs.writeFileSync(
      this.configPath,
      JSON.stringify(encryptedConfig, null, 2),
      {
        encoding: 'utf8',
        mode: 0o600
      }
    )

    console.log('✅ Secure configuration saved successfully')
  }

  /**
   * 設定値を取得
   */
  get<T = any>(key: string, defaultValue?: T): T {
    if (!this.isLoaded) {
      throw new Error('Configuration not loaded. Call load() first.')
    }

    const value = this.getNestedValue(this.config, key)

    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue
      }
      throw new Error(`Configuration key "${key}" not found`)
    }

    return value as T
  }

  /**
   * 設定値を設定
   */
  set(key: string, value: any): void {
    if (!this.isLoaded) {
      throw new Error('Configuration not loaded. Call load() first.')
    }

    // センシティブなキーの検出
    if (this.isSensitiveKey(key) && typeof value === 'string') {
      console.log(`🔒 Encrypting sensitive configuration: ${key}`)
    }

    this.setNestedValue(this.config, key, value)
  }

  /**
   * 複数の設定値を一括設定
   */
  setBulk(configs: Record<string, any>): void {
    Object.entries(configs).forEach(([key, value]) => {
      this.set(key, value)
    })
  }

  /**
   * 設定値を削除
   */
  remove(key: string): void {
    if (!this.isLoaded) {
      throw new Error('Configuration not loaded. Call load() first.')
    }

    this.deleteNestedValue(this.config, key)
  }

  /**
   * すべての設定をクリア
   */
  clear(): void {
    this.config = {}
    this.isLoaded = true
  }

  /**
   * 環境変数から設定をインポート
   */
  importFromEnv(prefix: string = ''): void {
    Object.entries(process.env).forEach(([key, value]) => {
      if (prefix && !key.startsWith(prefix)) {
        return
      }

      const configKey = prefix ? key.replace(prefix, '') : key

      // センシティブな環境変数を自動検出
      if (this.isSensitiveKey(configKey)) {
        this.set(configKey, value)
      }
    })
  }

  /**
   * 設定を環境変数にエクスポート
   */
  exportToEnv(prefix: string = ''): void {
    if (!this.isLoaded) {
      throw new Error('Configuration not loaded. Call load() first.')
    }

    Object.entries(this.config).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        process.env[`${prefix}${key}`] = String(value)
      }
    })
  }

  /**
   * センシティブなキーかどうか判定
   */
  private isSensitiveKey(key: string): boolean {
    return SecureConfigManager.SENSITIVE_PATTERNS.some(pattern =>
      pattern.test(key)
    )
  }

  /**
   * ネストされた値を取得
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.')
    let current = obj

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined
      }
      current = current[key]
    }

    return current
  }

  /**
   * ネストされた値を設定
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!

    let current = obj

    for (const key of keys) {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }

    current[lastKey] = value
  }

  /**
   * ネストされた値を削除
   */
  private deleteNestedValue(obj: any, path: string): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!

    let current = obj

    for (const key of keys) {
      if (!current[key]) {
        return
      }
      current = current[key]
    }

    delete current[lastKey]
  }

  /**
   * チェックサムを計算
   */
  private calculateChecksum(data: any): string {
    const json = JSON.stringify(data, Object.keys(data).sort())
    return crypto.createHash('sha256').update(json).digest('hex')
  }

  /**
   * 署名を生成
   */
  private generateSignature(data: string, metadata: ConfigMetadata): string {
    const content = `${data}.${JSON.stringify(metadata)}`
    const hmac = crypto.createHmac('sha256', this.masterKey)
    hmac.update(content)
    return hmac.digest('hex')
  }

  /**
   * 署名を検証
   */
  private verifySignature(config: EncryptedConfig): boolean {
    const expectedSignature = this.generateSignature(
      config.data,
      config.metadata
    )

    return EncryptionManager.timingSafeCompare(
      config.signature,
      expectedSignature
    )
  }

  /**
   * 設定のバックアップを作成
   */
  async backup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `${this.configPath}.backup.${timestamp}`

    if (fs.existsSync(this.configPath)) {
      fs.copyFileSync(this.configPath, backupPath)
    }

    return backupPath
  }

  /**
   * 設定をリストア
   */
  async restore(backupPath: string): Promise<void> {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`)
    }

    fs.copyFileSync(backupPath, this.configPath)
    await this.load()
  }

  /**
   * 設定の検証
   */
  validate(): boolean {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]

    const missing = required.filter(key => !this.config[key])

    if (missing.length > 0) {
      console.error('❌ Missing required configuration:', missing)
      return false
    }

    return true
  }

  /**
   * 設定のスナップショット
   */
  snapshot(): SecureConfig {
    return JSON.parse(JSON.stringify(this.config))
  }
}

// エクスポート
export type { SecureConfig, ConfigMetadata, EncryptedConfig }