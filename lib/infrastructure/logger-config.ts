/**
 * Centralized Logging Configuration
 * 統一されたログ管理システム
 */

import { SecureLogger } from '@/lib/security/secure-logger'
import { configManager } from './config-manager'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'
export type LogTarget = 'console' | 'file' | 'remote'

interface LogConfig {
  level: LogLevel
  targets: LogTarget[]
  format: 'json' | 'text'
  sanitize: boolean
  encryptLogs: boolean
  maxFileSize: number
  maxFiles: number
  remoteEndpoint?: string
  metadata?: Record<string, any>
}

interface LogContext {
  requestId?: string
  userId?: string
  apiKey?: string
  endpoint?: string
  method?: string
  ip?: string
  userAgent?: string
  [key: string]: any
}

class CentralizedLogger {
  private static instance: CentralizedLogger
  private config: LogConfig
  private secureLogger: SecureLogger
  private buffer: Array<{ timestamp: Date; level: LogLevel; message: string; context?: LogContext }> = []
  private flushInterval: NodeJS.Timeout | null = null

  private constructor() {
    const appConfig = configManager.getConfig()

    this.config = {
      level: this.getLogLevel(appConfig.monitoring.logLevel),
      targets: this.getLogTargets(),
      format: appConfig.app.env === 'production' ? 'json' : 'text',
      sanitize: true,
      encryptLogs: appConfig.app.env === 'production',
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      remoteEndpoint: process.env.LOG_REMOTE_ENDPOINT,
      metadata: {
        service: 'xbrl-api-minimal',
        version: appConfig.app.version,
        environment: appConfig.app.env
      }
    }

    // SecureLoggerの初期化
    this.secureLogger = SecureLogger.getInstance({
      logLevel: this.config.level.toUpperCase() as any,
      logToFile: this.config.targets.includes('file'),
      logToConsole: this.config.targets.includes('console'),
      encryptLogs: this.config.encryptLogs,
      maxFileSize: this.config.maxFileSize,
      maxFiles: this.config.maxFiles
    })

    // バッファフラッシュの設定
    if (this.config.targets.includes('remote')) {
      this.startBufferFlush()
    }
  }

  static getInstance(): CentralizedLogger {
    if (!CentralizedLogger.instance) {
      CentralizedLogger.instance = new CentralizedLogger()
    }
    return CentralizedLogger.instance
  }

  /**
   * ログレベルの変換
   */
  private getLogLevel(level: string): LogLevel {
    const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical']
    return validLevels.includes(level as LogLevel) ? level as LogLevel : 'info'
  }

  /**
   * ログターゲットの取得
   */
  private getLogTargets(): LogTarget[] {
    const targets: LogTarget[] = []
    const env = configManager.getConfig().app.env

    // 環境ごとのデフォルト設定
    if (env === 'production') {
      targets.push('file')
      if (process.env.LOG_REMOTE_ENDPOINT) {
        targets.push('remote')
      }
    } else if (env === 'test') {
      // テスト環境ではコンソールのみ
      targets.push('console')
    } else {
      // 開発環境
      targets.push('console')
      if (process.env.ENABLE_FILE_LOGGING === 'true') {
        targets.push('file')
      }
    }

    // 環境変数でオーバーライド
    const customTargets = process.env.LOG_TARGETS?.split(',') as LogTarget[]
    if (customTargets?.length > 0) {
      return customTargets
    }

    return targets
  }

  /**
   * ログ出力のレベルチェック
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4
    }

    return levels[level] >= levels[this.config.level]
  }

  /**
   * コンテキストのサニタイズ
   */
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined

    const sanitized = { ...context }

    // センシティブなフィールドをマスク
    const sensitiveFields = ['apiKey', 'password', 'token', 'secret', 'credential']

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = this.maskSensitiveData(sanitized[field])
      }
    }

    // IPアドレスの部分マスク
    if (sanitized.ip) {
      sanitized.ip = this.maskIpAddress(sanitized.ip)
    }

    return sanitized
  }

  /**
   * センシティブデータのマスク
   */
  private maskSensitiveData(value: string): string {
    if (value.length <= 8) {
      return '***'
    }
    return value.substring(0, 4) + '***' + value.substring(value.length - 4)
  }

  /**
   * IPアドレスのマスク
   */
  private maskIpAddress(ip: string): string {
    const parts = ip.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.XXX`
    }
    return ip.substring(0, ip.length / 2) + '***'
  }

  /**
   * ログメッセージのフォーマット
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const sanitizedContext = this.config.sanitize ? this.sanitizeContext(context) : context

    if (this.config.format === 'json') {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...this.config.metadata,
        context: sanitizedContext
      })
    }

    // テキストフォーマット
    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`

    if (sanitizedContext && Object.keys(sanitizedContext).length > 0) {
      formatted += ` | Context: ${JSON.stringify(sanitizedContext)}`
    }

    return formatted
  }

  /**
   * リモートログ送信
   */
  private async sendToRemote(logs: Array<any>): Promise<void> {
    if (!this.config.remoteEndpoint) return

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service': this.config.metadata?.service || 'unknown',
          'X-Environment': this.config.metadata?.environment || 'unknown'
        },
        body: JSON.stringify({ logs })
      })

      if (!response.ok) {
        console.error(`Failed to send logs to remote: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to send logs to remote:', error)
    }
  }

  /**
   * バッファフラッシュの開始
   */
  private startBufferFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushBuffer()
    }, 5000) // 5秒ごとにフラッシュ
  }

  /**
   * バッファのフラッシュ
   */
  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return

    const logs = [...this.buffer]
    this.buffer = []

    if (this.config.targets.includes('remote')) {
      await this.sendToRemote(logs)
    }
  }

  // ========== パブリックメソッド ==========

  /**
   * デバッグログ
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return

    const formatted = this.formatMessage('debug', message, context)
    this.secureLogger.debug(message, context)

    if (this.config.targets.includes('remote')) {
      this.buffer.push({ timestamp: new Date(), level: 'debug', message, context })
    }
  }

  /**
   * 情報ログ
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return

    const formatted = this.formatMessage('info', message, context)
    this.secureLogger.info(message, context)

    if (this.config.targets.includes('remote')) {
      this.buffer.push({ timestamp: new Date(), level: 'info', message, context })
    }
  }

  /**
   * 警告ログ
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return

    const formatted = this.formatMessage('warn', message, context)
    this.secureLogger.warn(message, context)

    if (this.config.targets.includes('remote')) {
      this.buffer.push({ timestamp: new Date(), level: 'warn', message, context })
    }
  }

  /**
   * エラーログ
   */
  error(message: string, error?: Error | any, context?: LogContext): void {
    if (!this.shouldLog('error')) return

    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    }

    const formatted = this.formatMessage('error', message, errorContext)
    this.secureLogger.error(message, error, context)

    if (this.config.targets.includes('remote')) {
      this.buffer.push({ timestamp: new Date(), level: 'error', message, context: errorContext })
    }
  }

  /**
   * クリティカルログ
   */
  critical(message: string, error?: Error | any, context?: LogContext): void {
    if (!this.shouldLog('critical')) return

    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    }

    const formatted = this.formatMessage('critical', message, errorContext)
    this.secureLogger.critical(message, error, context)

    if (this.config.targets.includes('remote')) {
      this.buffer.push({ timestamp: new Date(), level: 'critical', message, context: errorContext })
      // クリティカルエラーは即座に送信
      this.flushBuffer()
    }
  }

  /**
   * 構造化ログ（メトリクス用）
   */
  metric(name: string, value: number, tags?: Record<string, string>): void {
    if (!configManager.getConfig().monitoring.enableMetrics) return

    const metricLog = {
      type: 'metric',
      name,
      value,
      tags: {
        ...tags,
        ...this.config.metadata
      },
      timestamp: new Date().toISOString()
    }

    this.info(`Metric: ${name}`, metricLog as any)
  }

  /**
   * パフォーマンスログ
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    const perfContext = {
      ...context,
      operation,
      duration_ms: duration,
      slow: duration > 1000 // 1秒以上は遅い
    }

    if (duration > 5000) {
      this.warn(`Slow operation: ${operation}`, perfContext)
    } else {
      this.debug(`Performance: ${operation}`, perfContext)
    }
  }

  /**
   * 監査ログ
   */
  audit(action: string, userId: string, details: Record<string, any>): void {
    const auditLog = {
      type: 'audit',
      action,
      userId,
      details,
      timestamp: new Date().toISOString(),
      ...this.config.metadata
    }

    this.info(`Audit: ${action}`, auditLog as any)
  }

  /**
   * セキュリティログ
   */
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const secContext = {
      ...context,
      security_event: event,
      severity
    }

    if (severity === 'critical') {
      this.critical(`Security Event: ${event}`, undefined, secContext)
    } else if (severity === 'high') {
      this.error(`Security Event: ${event}`, undefined, secContext)
    } else if (severity === 'medium') {
      this.warn(`Security Event: ${event}`, secContext)
    } else {
      this.info(`Security Event: ${event}`, secContext)
    }
  }

  /**
   * ログ設定の更新（実行時）
   */
  updateConfig(updates: Partial<LogConfig>): void {
    if (configManager.isProduction()) {
      this.warn('Attempting to update log config in production', { updates })
      return
    }

    this.config = { ...this.config, ...updates }
    this.info('Log configuration updated', { newConfig: this.config })
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }

    await this.flushBuffer()
  }
}

// シングルトンインスタンスをエクスポート
export const centralLogger = CentralizedLogger.getInstance()

// エイリアスをエクスポート（既存コードとの互換性）
export const logger = centralLogger

// 型をエクスポート
export type { LogConfig, LogContext }