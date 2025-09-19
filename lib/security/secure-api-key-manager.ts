/**
 * Secure API Key Manager
 * GitHub Security Alert #80 - APIキーの暗号化管理
 * CWE-312: Cleartext Storage of Sensitive Information
 */

import { EncryptionManager } from './encryption-manager'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

interface ApiKey {
  id: string
  key_hash: string
  key_prefix: string
  tier: 'free' | 'basic' | 'premium' | 'enterprise'
  name?: string
  description?: string
  permissions: string[]
  metadata: Record<string, any>
  created_at: string
  expires_at?: string
  last_used_at?: string
  usage_count: number
  rate_limit: number
  is_active: boolean
}

interface EncryptedApiKey {
  encrypted_key: string
  key_id: string
  created_at: string
  algorithm: string
}

interface ApiKeyValidation {
  isValid: boolean
  key?: ApiKey
  error?: string
  remainingQuota?: number
}

interface ApiKeyCreationOptions {
  tier?: 'free' | 'basic' | 'premium' | 'enterprise'
  name?: string
  description?: string
  permissions?: string[]
  expiresIn?: number // 有効期限（日数）
  rateLimit?: number // レート制限（リクエスト/分）
  metadata?: Record<string, any>
}

export class SecureApiKeyManager {
  private static instance: SecureApiKeyManager | null = null
  private supabase: SupabaseClient
  private encryptionKey: string
  private keyCache: Map<string, { key: ApiKey; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5分
  private readonly KEY_PREFIX_LENGTH = 8
  private readonly KEY_LENGTH = 32

  // デフォルト設定
  private static readonly DEFAULT_RATE_LIMITS = {
    free: 10,
    basic: 100,
    premium: 1000,
    enterprise: 10000
  }

  private static readonly DEFAULT_PERMISSIONS = {
    free: ['read:public'],
    basic: ['read:public', 'read:financial'],
    premium: ['read:public', 'read:financial', 'write:financial'],
    enterprise: ['read:*', 'write:*', 'admin:*']
  }

  private constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error('Supabase credentials not configured')
    }

    this.supabase = createClient(url, key)
    this.encryptionKey = process.env.API_KEY_ENCRYPTION_KEY ||
                         EncryptionManager.generateSecurePassword(32)

    // 環境変数に保存
    if (!process.env.API_KEY_ENCRYPTION_KEY) {
      process.env.API_KEY_ENCRYPTION_KEY = this.encryptionKey
    }
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(supabaseUrl?: string, supabaseKey?: string): SecureApiKeyManager {
    if (!this.instance) {
      this.instance = new SecureApiKeyManager(supabaseUrl, supabaseKey)
    }
    return this.instance
  }

  /**
   * 新しいAPIキーを生成
   */
  async generateApiKey(
    userId: string,
    options: ApiKeyCreationOptions = {}
  ): Promise<{ apiKey: string; keyId: string; prefix: string }> {
    const {
      tier = 'free',
      name,
      description,
      permissions = SecureApiKeyManager.DEFAULT_PERMISSIONS[tier],
      expiresIn,
      rateLimit = SecureApiKeyManager.DEFAULT_RATE_LIMITS[tier],
      metadata = {}
    } = options

    // APIキー生成
    const keyBytes = crypto.randomBytes(this.KEY_LENGTH)
    const apiKey = keyBytes.toString('base64url')
    const keyId = crypto.randomUUID()

    // プレフィックス生成（識別用）
    const prefix = `xbrl_${tier.substring(0, 1)}_${crypto.randomBytes(4).toString('hex')}`

    // フルキー
    const fullKey = `${prefix}_${apiKey}`

    // ハッシュ化
    const keyHash = await this.hashApiKey(fullKey)

    // 有効期限設定
    let expiresAt: string | undefined
    if (expiresIn) {
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + expiresIn)
      expiresAt = expiry.toISOString()
    }

    // データベースに保存
    const { error: dbError } = await this.supabase
      .from('api_keys')
      .insert({
        id: keyId,
        user_id: userId,
        key_hash: keyHash,
        key_prefix: prefix,
        tier,
        name,
        description,
        permissions,
        metadata: {
          ...metadata,
          created_by: 'SecureApiKeyManager',
          algorithm: 'pbkdf2-sha256'
        },
        expires_at: expiresAt,
        rate_limit: rateLimit,
        is_active: true
      })

    if (dbError) {
      throw new Error(`Failed to create API key: ${dbError.message}`)
    }

    // 暗号化して保存（バックアップ用）
    await this.storeEncryptedKey(keyId, fullKey)

    // 監査ログ
    await this.logKeyEvent(keyId, userId, 'created', {
      tier,
      permissions,
      expires_at: expiresAt
    })

    return {
      apiKey: fullKey,
      keyId,
      prefix
    }
  }

  /**
   * APIキーを検証
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidation> {
    try {
      // キャッシュチェック
      const cached = this.getCachedKey(apiKey)
      if (cached) {
        return {
          isValid: true,
          key: cached,
          remainingQuota: await this.getRemainingQuota(cached.id)
        }
      }

      // ハッシュ化
      const keyHash = await this.hashApiKey(apiKey)

      // プレフィックス抽出
      const prefix = apiKey.split('_').slice(0, 3).join('_')

      // データベースで検索
      const { data, error } = await this.supabase
        .from('api_keys')
        .select('*')
        .eq('key_hash', keyHash)
        .eq('key_prefix', prefix)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return {
          isValid: false,
          error: 'Invalid API key'
        }
      }

      // 有効期限チェック
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        await this.deactivateKey(data.id, 'expired')
        return {
          isValid: false,
          error: 'API key has expired'
        }
      }

      // レート制限チェック
      const isRateLimited = await this.checkRateLimit(data.id, data.rate_limit)
      if (isRateLimited) {
        return {
          isValid: false,
          error: 'Rate limit exceeded'
        }
      }

      // 使用回数と最終使用時刻を更新
      await this.updateKeyUsage(data.id)

      // キャッシュに保存
      this.cacheKey(apiKey, data)

      return {
        isValid: true,
        key: data,
        remainingQuota: await this.getRemainingQuota(data.id)
      }

    } catch (error) {
      console.error('API key validation error:', error)
      return {
        isValid: false,
        error: 'Validation failed'
      }
    }
  }

  /**
   * APIキーをローテーション
   */
  async rotateApiKey(
    keyId: string,
    userId: string
  ): Promise<{ newApiKey: string; newKeyId: string }> {
    // 既存のキーを取得
    const { data: existingKey, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .eq('user_id', userId)
      .single()

    if (error || !existingKey) {
      throw new Error('API key not found')
    }

    // 新しいキーを生成
    const result = await this.generateApiKey(userId, {
      tier: existingKey.tier,
      name: `${existingKey.name || 'API Key'} (Rotated)`,
      description: `Rotated from ${keyId}`,
      permissions: existingKey.permissions,
      rateLimit: existingKey.rate_limit,
      metadata: {
        ...existingKey.metadata,
        rotated_from: keyId,
        rotated_at: new Date().toISOString()
      }
    })

    // 古いキーを無効化
    await this.deactivateKey(keyId, 'rotated')

    // 監査ログ
    await this.logKeyEvent(keyId, userId, 'rotated', {
      new_key_id: result.keyId
    })

    return {
      newApiKey: result.apiKey,
      newKeyId: result.keyId
    }
  }

  /**
   * APIキーを無効化
   */
  async revokeApiKey(keyId: string, userId: string, reason?: string): Promise<void> {
    await this.deactivateKey(keyId, reason || 'revoked')

    // キャッシュから削除
    this.clearCacheForKey(keyId)

    // 監査ログ
    await this.logKeyEvent(keyId, userId, 'revoked', { reason })
  }

  /**
   * ユーザーのAPIキー一覧を取得
   */
  async listUserApiKeys(
    userId: string,
    includeInactive: boolean = false
  ): Promise<ApiKey[]> {
    const query = this.supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to list API keys: ${error.message}`)
    }

    return data || []
  }

  /**
   * APIキーのハッシュ化
   */
  private async hashApiKey(apiKey: string): Promise<string> {
    // PBKDF2でハッシュ化（レインボーテーブル攻撃対策）
    const salt = process.env.API_KEY_SALT || 'xbrl-api-salt-2024'
    const iterations = 100000
    const keyLength = 32

    return crypto
      .pbkdf2Sync(apiKey, salt, iterations, keyLength, 'sha256')
      .toString('hex')
  }

  /**
   * 暗号化されたキーを保存（バックアップ用）
   */
  private async storeEncryptedKey(keyId: string, apiKey: string): Promise<void> {
    const encrypted = EncryptionManager.encrypt(apiKey, this.encryptionKey)

    const encryptedKey: EncryptedApiKey = {
      encrypted_key: JSON.stringify(encrypted),
      key_id: keyId,
      created_at: new Date().toISOString(),
      algorithm: encrypted.algorithm
    }

    // セキュアストレージに保存
    const { error } = await this.supabase
      .from('encrypted_api_keys')
      .insert(encryptedKey)

    if (error) {
      console.error('Failed to store encrypted key:', error)
    }
  }

  /**
   * レート制限チェック
   */
  private async checkRateLimit(keyId: string, limit: number): Promise<boolean> {
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60000)

    const { count, error } = await this.supabase
      .from('api_key_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', keyId)
      .gte('created_at', oneMinuteAgo.toISOString())

    if (error) {
      console.error('Rate limit check failed:', error)
      return false
    }

    return (count || 0) >= limit
  }

  /**
   * 残りクォータを取得
   */
  private async getRemainingQuota(keyId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('rate_limit')
      .eq('id', keyId)
      .single()

    if (error || !data) {
      return 0
    }

    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60000)

    const { count } = await this.supabase
      .from('api_key_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', keyId)
      .gte('created_at', oneMinuteAgo.toISOString())

    return Math.max(0, data.rate_limit - (count || 0))
  }

  /**
   * キー使用状況を更新
   */
  private async updateKeyUsage(keyId: string): Promise<void> {
    // 使用ログを記録
    await this.supabase
      .from('api_key_usage_logs')
      .insert({
        api_key_id: keyId,
        endpoint: 'validation',
        ip_address: this.getClientIp(),
        user_agent: this.getUserAgent()
      })

    // 最終使用時刻を更新（使用回数は自動的にトリガーで更新される）
    await this.supabase
      .from('api_keys')
      .update({
        last_used_at: new Date().toISOString()
      })
      .eq('id', keyId)
  }

  /**
   * キーを無効化
   */
  private async deactivateKey(keyId: string, reason: string): Promise<void> {
    await this.supabase
      .from('api_keys')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivation_reason: reason
      })
      .eq('id', keyId)
  }

  /**
   * 監査ログを記録
   */
  private async logKeyEvent(
    keyId: string,
    userId: string,
    event: string,
    details?: any
  ): Promise<void> {
    await this.supabase
      .from('api_key_audit_logs')
      .insert({
        api_key_id: keyId,
        user_id: userId,
        event,
        details,
        ip_address: this.getClientIp(),
        user_agent: this.getUserAgent()
      })
  }

  /**
   * キャッシュ管理
   */
  private cacheKey(apiKey: string, key: ApiKey): void {
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex')
    this.keyCache.set(hashedKey, {
      key,
      timestamp: Date.now()
    })

    // 古いエントリを削除
    setTimeout(() => {
      this.keyCache.delete(hashedKey)
    }, this.CACHE_TTL)
  }

  private getCachedKey(apiKey: string): ApiKey | null {
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex')
    const cached = this.keyCache.get(hashedKey)

    if (!cached) return null

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.keyCache.delete(hashedKey)
      return null
    }

    return cached.key
  }

  private clearCacheForKey(keyId: string): void {
    for (const [hash, cached] of this.keyCache.entries()) {
      if (cached.key.id === keyId) {
        this.keyCache.delete(hash)
      }
    }
  }

  /**
   * クライアントIP取得（プライバシー保護）
   */
  private getClientIp(): string {
    // Next.jsコンテキストから取得
    const ip = (global as any).clientIp || '0.0.0.0'
    // 最後のオクテットをマスク
    return ip.replace(/\.\d+$/, '.XXX')
  }

  /**
   * User-Agent取得
   */
  private getUserAgent(): string {
    return (global as any).userAgent || 'Unknown'
  }

  /**
   * APIキー統計を取得
   */
  async getKeyStatistics(keyId: string): Promise<{
    totalRequests: number
    requestsToday: number
    requestsThisMonth: number
    averageRequestsPerDay: number
    topEndpoints: Array<{ endpoint: string; count: number }>
  }> {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // 全リクエスト数
    const { count: totalRequests } = await this.supabase
      .from('api_key_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', keyId)

    // 今日のリクエスト数
    const { count: requestsToday } = await this.supabase
      .from('api_key_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', keyId)
      .gte('created_at', todayStart.toISOString())

    // 今月のリクエスト数
    const { count: requestsThisMonth } = await this.supabase
      .from('api_key_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', keyId)
      .gte('created_at', monthStart.toISOString())

    // 平均リクエスト数の計算
    const { data: firstLog } = await this.supabase
      .from('api_key_usage_logs')
      .select('created_at')
      .eq('api_key_id', keyId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    const daysSinceCreation = firstLog
      ? Math.max(1, Math.floor((now.getTime() - new Date(firstLog.created_at).getTime()) / (1000 * 60 * 60 * 24)))
      : 1

    const averageRequestsPerDay = Math.round((totalRequests || 0) / daysSinceCreation)

    // トップエンドポイント
    const { data: endpoints } = await this.supabase
      .from('api_key_usage_logs')
      .select('endpoint')
      .eq('api_key_id', keyId)

    const endpointCounts = (endpoints || []).reduce((acc: any, log: any) => {
      acc[log.endpoint] = (acc[log.endpoint] || 0) + 1
      return acc
    }, {})

    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalRequests: totalRequests || 0,
      requestsToday: requestsToday || 0,
      requestsThisMonth: requestsThisMonth || 0,
      averageRequestsPerDay,
      topEndpoints
    }
  }
}

// エクスポート
export type {
  ApiKey,
  ApiKeyValidation,
  ApiKeyCreationOptions,
  EncryptedApiKey
}