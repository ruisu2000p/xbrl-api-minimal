/**
 * Secure Logger with Automatic Sanitization
 * GitHub Security Alert #80 - センシティブ情報の自動サニタイズ
 * CWE-312: Cleartext Storage of Sensitive Information
 */

import fs from 'fs'
import path from 'path'
import { EncryptionManager } from './encryption-manager'

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  sanitized?: string[]
  stackTrace?: string
  requestId?: string
  userId?: string
  ipAddress?: string
}

interface SecureLoggerOptions {
  logLevel?: LogLevel
  logToFile?: boolean
  logToConsole?: boolean
  encryptLogs?: boolean
  maxFileSize?: number
  maxFiles?: number
  sanitizePatterns?: RegExp[]
  redactLength?: number
}

export class SecureLogger {
  private static instance: SecureLogger | null = null
  private options: SecureLoggerOptions
  private logFilePath: string
  private encryptionKey?: string

  // デフォルトのサニタイズパターン
  private static readonly DEFAULT_SANITIZE_PATTERNS = [
    // APIキー・トークン
    /(?:api[_-]?key|token|auth|bearer)\s*[:=]\s*['"]?([A-Za-z0-9+/=_-]{10,})['"]?/gi,
    /eyJ[A-Za-z0-9+/=_-]+\.eyJ[A-Za-z0-9+/=_-]+\.[A-Za-z0-9+/=_-]+/g, // JWT

    // パスワード
    /(?:password|passwd|pwd|pass)\s*[:=]\s*['"]?([^'"\s]{3,})['"]?/gi,

    // クレジットカード番号
    /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

    // 社会保障番号（SSN）
    /\b\d{3}-\d{2}-\d{4}\b/g,

    // メールアドレス（部分的にマスク）
    /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,

    // IPアドレス（プライベートIPは除く）
    /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,

    // データベース接続文字列
    /(?:mongodb|postgres|mysql|redis):\/\/[^\s]+/gi,

    // AWSアクセスキー
    /AKIA[0-9A-Z]{16}/g,

    // プライベートキー
    /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]+?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,

    // Base64エンコードされた認証情報
    /Basic\s+[A-Za-z0-9+/=]{10,}/g,

    // Supabaseキー
    /(?:supabase|sb)[_-]?(?:key|token|secret)\s*[:=]\s*['"]?([A-Za-z0-9+/=_-]{20,})['"]?/gi,

    // 環境変数のシークレット
    /(?:SECRET|KEY|TOKEN|PASSWORD|CREDENTIAL)[A-Z_]*\s*=\s*['"]?([^'"\s]+)['"]?/g
  ]

  // ログレベルの優先度
  private static readonly LOG_LEVELS: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4
  }

  private constructor(options: SecureLoggerOptions = {}) {
    this.options = {
      logLevel: 'INFO',
      logToFile: true,
      logToConsole: true,
      encryptLogs: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      redactLength: 6,
      ...options,
      sanitizePatterns: [
        ...SecureLogger.DEFAULT_SANITIZE_PATTERNS,
        ...(options.sanitizePatterns || [])
      ]
    }

    this.logFilePath = path.join(process.cwd(), 'logs', 'secure-app.log')
    this.ensureLogDirectory()

    if (this.options.encryptLogs) {
      this.encryptionKey = process.env.LOG_ENCRYPTION_KEY ||
                           EncryptionManager.generateSecurePassword(32)
    }
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(options?: SecureLoggerOptions): SecureLogger {
    if (!this.instance) {
      this.instance = new SecureLogger(options)
    }
    return this.instance
  }

  /**
   * ログディレクトリを確保
   */
  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.logFilePath)
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
  }

  /**
   * デバッグログ
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('DEBUG', message, context)
  }

  /**
   * 情報ログ
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('INFO', message, context)
  }

  /**
   * 警告ログ
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('WARN', message, context)
  }

  /**
   * エラーログ
   */
  error(message: string, error?: Error | any, context?: Record<string, any>): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    }

    this.log('ERROR', message, errorContext)
  }

  /**
   * クリティカルログ
   */
  critical(message: string, error?: Error | any, context?: Record<string, any>): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    }

    this.log('CRITICAL', message, errorContext)

    // クリティカルエラーの場合、アラートを送信
    this.sendAlert(message, errorContext)
  }

  /**
   * ログ出力
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    // レベルチェック
    if (SecureLogger.LOG_LEVELS[level] < SecureLogger.LOG_LEVELS[this.options.logLevel!]) {
      return
    }

    // サニタイズ
    const sanitizedResult = this.sanitize(message, context)

    // ログエントリ作成
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: sanitizedResult.message,
      context: sanitizedResult.context,
      sanitized: sanitizedResult.sanitized.length > 0 ? sanitizedResult.sanitized : undefined,
      requestId: this.getRequestId(),
      userId: this.getUserId(),
      ipAddress: this.getIpAddress()
    }

    // コンソール出力
    if (this.options.logToConsole) {
      this.logToConsole(entry)
    }

    // ファイル出力
    if (this.options.logToFile) {
      this.logToFile(entry)
    }
  }

  /**
   * メッセージとコンテキストをサニタイズ
   */
  private sanitize(
    message: string,
    context?: Record<string, any>
  ): { message: string; context?: Record<string, any>; sanitized: string[] } {
    const sanitized: string[] = []
    let sanitizedMessage = message
    let sanitizedContext = context ? JSON.parse(JSON.stringify(context)) : undefined

    // メッセージのサニタイズ
    for (const pattern of this.options.sanitizePatterns!) {
      const matches = sanitizedMessage.match(pattern)
      if (matches) {
        matches.forEach(match => {
          const redacted = this.redact(match)
          sanitizedMessage = sanitizedMessage.replace(match, redacted)
          sanitized.push(`Message: ${match.substring(0, 20)}...`)
        })
      }
    }

    // コンテキストのサニタイズ
    if (sanitizedContext) {
      this.sanitizeObject(sanitizedContext, sanitized)
    }

    return {
      message: sanitizedMessage,
      context: sanitizedContext,
      sanitized
    }
  }

  /**
   * オブジェクトを再帰的にサニタイズ
   */
  private sanitizeObject(obj: any, sanitized: string[], path: string = ''): void {
    if (typeof obj !== 'object' || obj === null) {
      return
    }

    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue

      const currentPath = path ? `${path}.${key}` : key
      const value = obj[key]

      // センシティブなキー名をチェック
      if (this.isSensitiveKey(key)) {
        obj[key] = this.redact(String(value))
        sanitized.push(`Context.${currentPath}`)
        continue
      }

      // 文字列値をチェック
      if (typeof value === 'string') {
        for (const pattern of this.options.sanitizePatterns!) {
          const matches = value.match(pattern)
          if (matches) {
            obj[key] = this.redact(value)
            sanitized.push(`Context.${currentPath}`)
            break
          }
        }
      }
      // オブジェクトの場合は再帰的に処理
      else if (typeof value === 'object' && value !== null) {
        this.sanitizeObject(value, sanitized, currentPath)
      }
    }
  }

  /**
   * センシティブなキー名かチェック
   */
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'passwd', 'pass', 'pwd',
      'secret', 'token', 'key', 'auth',
      'credential', 'private', 'api_key',
      'apikey', 'access_token', 'refresh_token',
      'client_secret', 'jwt', 'bearer'
    ]

    const lowerKey = key.toLowerCase()
    return sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))
  }

  /**
   * 値をマスキング
   */
  private redact(value: string): string {
    if (!value) return '[REDACTED]'

    const length = value.length
    const visibleLength = Math.min(this.options.redactLength!, Math.floor(length / 4))

    if (length <= visibleLength * 2) {
      return '[REDACTED]'
    }

    const prefix = value.substring(0, visibleLength)
    const suffix = value.substring(length - visibleLength)

    return `${prefix}[REDACTED-${length - visibleLength * 2}]${suffix}`
  }

  /**
   * コンソールにログ出力
   */
  private logToConsole(entry: LogEntry): void {
    const colors = {
      DEBUG: '\x1b[36m',    // Cyan
      INFO: '\x1b[32m',     // Green
      WARN: '\x1b[33m',     // Yellow
      ERROR: '\x1b[31m',    // Red
      CRITICAL: '\x1b[35m'  // Magenta
    }

    const reset = '\x1b[0m'
    const color = colors[entry.level]

    const message = `${color}[${entry.timestamp}] [${entry.level}]${reset} ${entry.message}`

    if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
      console.error(message)
      if (entry.context) {
        console.error('Context:', entry.context)
      }
    } else if (entry.level === 'WARN') {
      console.warn(message)
      if (entry.context) {
        console.warn('Context:', entry.context)
      }
    } else {
      console.log(message)
      if (entry.context && entry.level === 'DEBUG') {
        console.log('Context:', entry.context)
      }
    }

    if (entry.sanitized && entry.sanitized.length > 0) {
      console.log(`${color}[SANITIZED]${reset}`, entry.sanitized)
    }
  }

  /**
   * ファイルにログ出力
   */
  private logToFile(entry: LogEntry): void {
    try {
      // ファイルサイズチェック
      this.rotateLogsIfNeeded()

      let logLine = JSON.stringify(entry) + '\n'

      // 暗号化が有効な場合
      if (this.options.encryptLogs && this.encryptionKey) {
        const encrypted = EncryptionManager.encrypt(logLine, this.encryptionKey)
        logLine = JSON.stringify(encrypted) + '\n'
      }

      fs.appendFileSync(this.logFilePath, logLine)
    } catch (error) {
      console.error('Failed to write log to file:', error)
    }
  }

  /**
   * ログローテーション
   */
  private rotateLogsIfNeeded(): void {
    try {
      const stats = fs.statSync(this.logFilePath)

      if (stats.size >= this.options.maxFileSize!) {
        // 古いログファイルをローテーション
        for (let i = this.options.maxFiles! - 1; i > 0; i--) {
          const oldPath = `${this.logFilePath}.${i}`
          const newPath = `${this.logFilePath}.${i + 1}`

          if (fs.existsSync(oldPath)) {
            if (i === this.options.maxFiles! - 1) {
              fs.unlinkSync(oldPath)
            } else {
              fs.renameSync(oldPath, newPath)
            }
          }
        }

        // 現在のログファイルをローテーション
        fs.renameSync(this.logFilePath, `${this.logFilePath}.1`)
      }
    } catch (error) {
      // ファイルが存在しない場合は無視
    }
  }

  /**
   * リクエストIDを取得
   */
  private getRequestId(): string | undefined {
    // Next.jsやExpressのコンテキストから取得
    if (typeof (global as any).requestId !== 'undefined') {
      return (global as any).requestId
    }
    return undefined
  }

  /**
   * ユーザーIDを取得
   */
  private getUserId(): string | undefined {
    // セッションやコンテキストから取得
    if (typeof (global as any).userId !== 'undefined') {
      return (global as any).userId
    }
    return undefined
  }

  /**
   * IPアドレスを取得（サニタイズ済み）
   */
  private getIpAddress(): string | undefined {
    if (typeof (global as any).ipAddress !== 'undefined') {
      const ip = (global as any).ipAddress
      // 最後のオクテットをマスク
      return ip.replace(/\.\d+$/, '.XXX')
    }
    return undefined
  }

  /**
   * アラートを送信（クリティカルエラー時）
   */
  private async sendAlert(message: string, context: any): Promise<void> {
    // 実装例: Slack、メール、PagerDuty等への通知
    // ここでは簡単な例として、専用のアラートファイルに記録
    const alertPath = path.join(process.cwd(), 'logs', 'critical-alerts.log')
    const alert = {
      timestamp: new Date().toISOString(),
      message,
      context
    }

    fs.appendFileSync(alertPath, JSON.stringify(alert) + '\n')
  }

  /**
   * ログを検索
   */
  async search(
    criteria: {
      level?: LogLevel
      startDate?: Date
      endDate?: Date
      message?: string
      userId?: string
    }
  ): Promise<LogEntry[]> {
    const logs: LogEntry[] = []

    try {
      let content = fs.readFileSync(this.logFilePath, 'utf8')

      // 暗号化されている場合は復号化
      if (this.options.encryptLogs && this.encryptionKey) {
        const lines = content.trim().split('\n')
        content = lines.map(line => {
          try {
            const encrypted = JSON.parse(line)
            const decrypted = EncryptionManager.decrypt(encrypted, this.encryptionKey!)
            return decrypted.data
          } catch {
            return line
          }
        }).join('\n')
      }

      // 各行をパース
      const lines = content.trim().split('\n')
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as LogEntry

          // 条件に一致するかチェック
          if (criteria.level && entry.level !== criteria.level) continue
          if (criteria.startDate && new Date(entry.timestamp) < criteria.startDate) continue
          if (criteria.endDate && new Date(entry.timestamp) > criteria.endDate) continue
          if (criteria.message && !entry.message.includes(criteria.message)) continue
          if (criteria.userId && entry.userId !== criteria.userId) continue

          logs.push(entry)
        } catch {
          // パースできない行はスキップ
        }
      }
    } catch (error) {
      console.error('Failed to search logs:', error)
    }

    return logs
  }

  /**
   * ログをクリア
   */
  clearLogs(): void {
    try {
      fs.writeFileSync(this.logFilePath, '')
      console.log('Logs cleared successfully')
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }
}

// デフォルトインスタンスをエクスポート
export const logger = SecureLogger.getInstance()

// 型定義をエクスポート
export type { LogLevel, LogEntry, SecureLoggerOptions }