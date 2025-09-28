/**
 * Rate Limiter Implementation
 * Supabaseを使用したレート制限システム
 */

import { supabaseManager } from './supabase-manager'
import { configManager } from './config-manager'
import { centralLogger } from './logger-config'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyPrefix: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  retryAfter?: number
}

interface RateLimitEntry {
  key: string
  count: number
  window_start: string
  window_end: string
  tier: string
}

export class RateLimiter {
  private static instance: RateLimiter
  private memoryStore: Map<string, { count: number; resetTime: Date }> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    // サーバレス環境チェック
    const isServerless =
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY ||
      process.env.NODE_ENV === 'test';

    if (!isServerless) {
      // メモリストアのクリーンアップを定期実行
      this.cleanupInterval = setInterval(() => {
        this.cleanupMemoryStore()
      }, 60000) // 1分ごと
    }
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter()
    }
    return RateLimiter.instance
  }

  /**
   * レート制限チェック（Supabase版）
   */
  async checkLimit(
    identifier: string,
    tier: 'freemium' | 'standard' = 'freemium'
  ): Promise<RateLimitResult> {
    const config = configManager.getConfig()
    const windowMs = config.rateLimit.windowMs

    // 直接configからmaxRequestsを取得
    const maxRequests = config.rateLimit.maxRequests[tier]

    try {
      // Supabaseでレート制限チェック
      return await this.checkSupabaseLimit(identifier, tier, windowMs, maxRequests)
    } catch (error) {
      centralLogger.error('Supabase rate limit check failed, falling back to memory', error)
      // Supabaseが利用できない場合はメモリストアにフォールバック
      return this.checkMemoryLimit(identifier, windowMs, maxRequests)
    }
  }

  /**
   * Supabaseでのレート制限チェック
   */
  private async checkSupabaseLimit(
    identifier: string,
    tier: string,
    windowMs: number,
    maxRequests: number
  ): Promise<RateLimitResult> {
    const now = new Date()
    const windowStart = new Date(now.getTime() - windowMs)
    const windowEnd = new Date(now.getTime() + windowMs)

    const supabase = supabaseManager.getServiceClient()
    if (!supabase) {
      console.error('Service client not available for rate limiting');
      return { allowed: true, limit: 100, remaining: 100, resetTime: new Date() };
    }

    // 現在のウィンドウでのリクエスト数を取得
    const { data: entries, error: fetchError } = await supabase
      .from('rate_limit_entries')
      .select('*')
      .eq('key', identifier)
      .gte('window_start', windowStart.toISOString())
      .lte('window_start', now.toISOString())

    if (fetchError) {
      throw fetchError
    }

    // 現在のカウントを計算
    const currentCount = entries?.reduce((sum, entry) => sum + (entry.count || 0), 0) || 0

    if (currentCount >= maxRequests) {
      // レート制限に達している
      const oldestEntry = entries?.[0]
      const resetTime = oldestEntry
        ? new Date(new Date(oldestEntry.window_start).getTime() + windowMs)
        : new Date(now.getTime() + windowMs)

      const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000)

      centralLogger.warn('Rate limit exceeded', {
        identifier,
        tier,
        currentCount,
        maxRequests,
        retryAfter
      })

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter
      }
    }

    // リクエストをカウント
    const { error: insertError } = await supabase
      .from('rate_limit_entries')
      .insert({
        key: identifier,
        count: 1,
        window_start: now.toISOString(),
        window_end: windowEnd.toISOString(),
        tier
      })

    if (insertError) {
      centralLogger.error('Failed to record rate limit entry', insertError)
    }

    // 古いエントリをクリーンアップ（非同期）
    this.cleanupOldEntries(identifier, windowStart).catch(err => {
      centralLogger.error('Failed to cleanup old rate limit entries', err)
    })

    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetTime: new Date(now.getTime() + windowMs)
    }
  }

  /**
   * メモリストアでのレート制限チェック（フォールバック）
   */
  private checkMemoryLimit(
    identifier: string,
    windowMs: number,
    maxRequests: number
  ): RateLimitResult {
    const now = new Date()
    const entry = this.memoryStore.get(identifier)

    if (!entry || entry.resetTime <= now) {
      // 新しいウィンドウを開始
      const resetTime = new Date(now.getTime() + windowMs)
      this.memoryStore.set(identifier, { count: 1, resetTime })

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime
      }
    }

    if (entry.count >= maxRequests) {
      // レート制限に達している
      const retryAfter = Math.ceil((entry.resetTime.getTime() - now.getTime()) / 1000)

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter
      }
    }

    // カウントを増やす
    entry.count++
    this.memoryStore.set(identifier, entry)

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }

  /**
   * 古いエントリのクリーンアップ（Supabase）
   */
  private async cleanupOldEntries(identifier: string, before: Date): Promise<void> {
    const supabase = supabaseManager.getServiceClient()
    if (!supabase) {
      console.error('Service client not available for rate limiting');
      return;
    }

    const { error } = await supabase
      .from('rate_limit_entries')
      .delete()
      .eq('key', identifier)
      .lt('window_end', before.toISOString())

    if (error) {
      centralLogger.error('Failed to cleanup old entries', error)
    }
  }

  /**
   * メモリストアのクリーンアップ
   */
  private cleanupMemoryStore(): void {
    const now = new Date()
    const keysToDelete: string[] = []

    this.memoryStore.forEach((entry, key) => {
      if (entry.resetTime <= now) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => {
      this.memoryStore.delete(key)
    })

    if (keysToDelete.length > 0) {
      centralLogger.debug(`Cleaned up ${keysToDelete.length} expired rate limit entries`)
    }
  }

  /**
   * 特定のキーのレート制限をリセット
   */
  async reset(identifier: string): Promise<void> {
    // メモリストアから削除
    this.memoryStore.delete(identifier)

    // Supabaseから削除
    try {
      const supabase = supabaseManager.getServiceClient()
      if (!supabase) {
        console.error('Service client not available for rate limiting');
        return;
      }
      const { error } = await supabase
        .from('rate_limit_entries')
        .delete()
        .eq('key', identifier)

      if (error) {
        centralLogger.error('Failed to reset rate limit in Supabase', error)
      }
    } catch (error) {
      centralLogger.error('Failed to reset rate limit', error)
    }
  }

  /**
   * レート制限の統計を取得
   */
  async getStats(identifier: string): Promise<{
    current: number
    limit: number
    percentage: number
    resetTime: Date
  } | null> {
    try {
      const supabase = supabaseManager.getServiceClient()
      if (!supabase) {
        console.error('Service client not available for rate limiting');
        return null;
      }
      const now = new Date()
      const config = configManager.getConfig()
      const windowMs = config.rateLimit.windowMs
      const windowStart = new Date(now.getTime() - windowMs)

      const { data: entries, error } = await supabase
        .from('rate_limit_entries')
        .select('*')
        .eq('key', identifier)
        .gte('window_start', windowStart.toISOString())

      if (error) {
        throw error
      }

      const currentCount = entries?.reduce((sum, entry) => sum + (entry.count || 0), 0) || 0
      const tier = entries?.[0]?.tier || 'free'
      const limit = config.rateLimit.maxRequests[tier as keyof typeof config.rateLimit.maxRequests]

      return {
        current: currentCount,
        limit,
        percentage: (currentCount / limit) * 100,
        resetTime: new Date(now.getTime() + windowMs)
      }
    } catch (error) {
      centralLogger.error('Failed to get rate limit stats', error)
      return null
    }
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.memoryStore.clear()
  }
}

/**
 * Express/Next.js用のミドルウェア
 */
export function createRateLimitMiddleware(
  keyExtractor: (req: any) => string | Promise<string>,
  tierExtractor?: (req: any) => 'freemium' | 'standard' | Promise<'freemium' | 'standard'>
) {
  const limiter = RateLimiter.getInstance()

  return async (req: any, res: any, next?: any) => {
    try {
      const identifier = await keyExtractor(req)
      const tier = tierExtractor ? await tierExtractor(req) : 'freemium'

      const result = await limiter.checkLimit(identifier, tier)

      // レスポンスヘッダーを設定
      res.setHeader('X-RateLimit-Limit', configManager.getConfig().rateLimit.maxRequests[tier])
      res.setHeader('X-RateLimit-Remaining', result.remaining)
      res.setHeader('X-RateLimit-Reset', result.resetTime.toISOString())

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfter || 60)

        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
            retryAfter: result.retryAfter,
            resetTime: result.resetTime.toISOString()
          }
        })
      }

      if (next) {
        next()
      }
    } catch (error) {
      centralLogger.error('Rate limit middleware error', error)
      // エラーが発生した場合はリクエストを通す（fail open）
      if (next) {
        next()
      }
    }
  }
}

// シングルトンインスタンスをエクスポート
export const rateLimiter = RateLimiter.getInstance()