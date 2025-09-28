/**
 * Unified API Key Manager
 * APIキー管理の統一実装
 *
 * 設計方針:
 * - bcryptをメインのハッシュ方式として採用
 * - api_keys_mainテーブルを使用
 * - 生成時のみ平文を返す
 * - 非同期処理を優先
 */

import { randomBytes, pbkdf2 } from 'crypto'
import { promisify } from 'util'
import type { SupabaseClient } from '@supabase/supabase-js'

const pbkdf2Async = promisify(pbkdf2)

// APIキーの設定
const API_KEY_CONFIG = {
  PREFIX_LENGTH: 8,
  KEY_LENGTH: 32,
  ITERATIONS: 100000, // PBKDF2のイテレーション数
  DIGEST: 'sha256',
  SALT_LENGTH: 32,
  TABLE: 'api_keys_main',
  SCHEMA: 'private',
} as const

// APIキーのフォーマット
export interface ApiKey {
  id: string
  user_id: string
  name: string
  key_prefix: string
  key_hash: string
  key_salt: string
  created_at: string
  last_used_at?: string
  is_active: boolean
  expires_at?: string
}

// APIキー生成結果
export interface ApiKeyGenerationResult {
  success: boolean
  apiKey?: string
  keyId?: string
  prefix?: string
  error?: string
}

// APIキー検証結果
export interface ApiKeyValidationResult {
  valid: boolean
  userId?: string
  keyId?: string
  error?: string
}

export class UnifiedApiKeyManager {
  private supabase: SupabaseClient

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  /**
   * セキュアなトークン生成（非同期）
   */
  private async generateSecureToken(length: number): Promise<string> {
    return new Promise((resolve, reject) => {
      randomBytes(length, (err, buffer) => {
        if (err) reject(err)
        else resolve(buffer.toString('base64url'))
      })
    })
  }

  /**
   * APIキーのハッシュ化（非同期）
   */
  private async hashApiKey(key: string, salt: string): Promise<string> {
    const hash = await pbkdf2Async(
      key,
      salt,
      API_KEY_CONFIG.ITERATIONS,
      32,
      API_KEY_CONFIG.DIGEST
    )
    return hash.toString('hex')
  }

  /**
   * タイミング攻撃耐性のある文字列比較
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
  }

  /**
   * APIキー生成
   */
  async generateApiKey(
    userId: string,
    name: string,
    expiresInDays?: number
  ): Promise<ApiKeyGenerationResult> {
    try {
      // トークン生成
      const [prefix, key, salt] = await Promise.all([
        this.generateSecureToken(API_KEY_CONFIG.PREFIX_LENGTH),
        this.generateSecureToken(API_KEY_CONFIG.KEY_LENGTH),
        this.generateSecureToken(API_KEY_CONFIG.SALT_LENGTH),
      ])

      // フルキーの作成
      const fullKey = `xbrl_${prefix}_${key}`

      // ハッシュ化
      const keyHash = await this.hashApiKey(key, salt)

      // 有効期限の計算
      let expiresAt: string | null = null
      if (expiresInDays) {
        const expiry = new Date()
        expiry.setDate(expiry.getDate() + expiresInDays)
        expiresAt = expiry.toISOString()
      }

      // データベースに保存（privateスキーマを明示的に指定）
      const { data, error } = await this.supabase
        .from(`${API_KEY_CONFIG.SCHEMA}.${API_KEY_CONFIG.TABLE}`)
        .insert({
          user_id: userId,
          name,
          key_prefix: prefix,
          key_hash: keyHash,
          key_salt: salt,
          is_active: true,
          expires_at: expiresAt,
        })
        .select('id')
        .single()

      if (error) {
        console.error('Failed to save API key to database:', {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          table: `${API_KEY_CONFIG.SCHEMA}.${API_KEY_CONFIG.TABLE}`
        })
        return {
          success: false,
          error: `APIキーの保存に失敗しました: ${error.message || 'Unknown error'}`,
        }
      }

      return {
        success: true,
        apiKey: fullKey,
        keyId: data.id,
        prefix,
      }
    } catch (error) {
      console.error('API key generation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'APIキー生成エラー',
      }
    }
  }

  /**
   * APIキー検証
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
    try {
      // APIキーのフォーマットチェック
      const keyPattern = /^xbrl_([^_]+)_(.+)$/
      const match = apiKey.match(keyPattern)

      if (!match) {
        return {
          valid: false,
          error: '無効なAPIキー形式',
        }
      }

      const [, prefix, key] = match

      // プレフィックスでキーを検索
      const { data: keyData, error } = await this.supabase
        .from(`${API_KEY_CONFIG.SCHEMA}.${API_KEY_CONFIG.TABLE}`)
        .select('id, user_id, key_hash, key_salt, is_active, expires_at')
        .eq('key_prefix', prefix)
        .eq('is_active', true)
        .single()

      if (error || !keyData) {
        return {
          valid: false,
          error: 'APIキーが見つかりません',
        }
      }

      // 有効期限チェック
      if (keyData.expires_at) {
        const expiry = new Date(keyData.expires_at)
        if (expiry < new Date()) {
          return {
            valid: false,
            error: 'APIキーの有効期限が切れています',
          }
        }
      }

      // ハッシュ検証
      const computedHash = await this.hashApiKey(key, keyData.key_salt)
      const isValid = this.secureCompare(computedHash, keyData.key_hash)

      if (!isValid) {
        return {
          valid: false,
          error: '認証に失敗しました',
        }
      }

      // 最終使用日時を更新（非同期で実行）
      this.updateLastUsed(keyData.id).catch(console.error)

      return {
        valid: true,
        userId: keyData.user_id,
        keyId: keyData.id,
      }
    } catch (error) {
      console.error('API key validation error:', error)
      return {
        valid: false,
        error: error instanceof Error ? error.message : '検証エラー',
      }
    }
  }

  /**
   * 最終使用日時の更新
   */
  private async updateLastUsed(keyId: string): Promise<void> {
    await this.supabase
      .from(`${API_KEY_CONFIG.SCHEMA}.${API_KEY_CONFIG.TABLE}`)
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId)
  }

  /**
   * APIキーの無効化
   */
  async revokeApiKey(keyId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(`${API_KEY_CONFIG.SCHEMA}.${API_KEY_CONFIG.TABLE}`)
        .update({ is_active: false })
        .eq('id', keyId)
        .eq('user_id', userId)

      return !error
    } catch (error) {
      console.error('API key revocation error:', error)
      return false
    }
  }

  /**
   * ユーザーのAPIキー一覧取得
   */
  async listUserApiKeys(userId: string): Promise<Partial<ApiKey>[]> {
    try {
      const { data, error } = await this.supabase
        .from(`${API_KEY_CONFIG.SCHEMA}.${API_KEY_CONFIG.TABLE}`)
        .select('id, user_id, name, key_prefix, created_at, last_used_at, is_active, expires_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to list API keys:', error)
      return []
    }
  }

  /**
   * APIキーローテーション
   */
  async rotateApiKey(
    oldKeyId: string,
    userId: string
  ): Promise<ApiKeyGenerationResult> {
    try {
      // 既存のキー情報を取得
      const { data: oldKey, error: fetchError } = await this.supabase
        .from(`${API_KEY_CONFIG.SCHEMA}.${API_KEY_CONFIG.TABLE}`)
        .select('name')
        .eq('id', oldKeyId)
        .eq('user_id', userId)
        .single()

      if (fetchError || !oldKey) {
        return {
          success: false,
          error: '既存のAPIキーが見つかりません',
        }
      }

      // 新しいキーを生成
      const result = await this.generateApiKey(
        userId,
        `${oldKey.name} (Rotated)`,
        30 // 30日間の有効期限
      )

      if (result.success) {
        // 古いキーを無効化
        await this.revokeApiKey(oldKeyId, userId)
      }

      return result
    } catch (error) {
      console.error('API key rotation error:', error)
      return {
        success: false,
        error: 'APIキーのローテーションに失敗しました',
      }
    }
  }
}

// シングルトンエクスポート用のヘルパー関数
let instance: UnifiedApiKeyManager | null = null

export function getApiKeyManager(supabaseClient: SupabaseClient): UnifiedApiKeyManager {
  if (!instance) {
    instance = new UnifiedApiKeyManager(supabaseClient)
  }
  return instance
}