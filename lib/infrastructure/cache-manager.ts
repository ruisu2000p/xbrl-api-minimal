/**
 * Cache Manager
 * APIキーメタデータとその他のデータのキャッシュ管理
 */

import { centralLogger } from './logger-config'
import crypto from 'crypto'

interface CacheEntry<T> {
  data: T
  expiresAt: number
  hits: number
  createdAt: number
}

interface CacheStats {
  totalEntries: number
  hitRate: number
  memoryUsage: number
  oldestEntry: number
  newestEntry: number
}

interface CacheConfig {
  maxEntries: number
  defaultTtl: number
  gcInterval: number
  maxMemoryMB: number
}

export class CacheManager {
  private static instance: CacheManager
  private cache: Map<string, CacheEntry<any>> = new Map()
  private hits: number = 0
  private misses: number = 0
  private gcInterval: NodeJS.Timeout | null = null
  private config: CacheConfig

  private constructor() {
    this.config = {
      maxEntries: parseInt(process.env.CACHE_MAX_ENTRIES || '10000', 10),
      defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300000', 10), // 5分
      gcInterval: parseInt(process.env.CACHE_GC_INTERVAL || '60000', 10), // 1分
      maxMemoryMB: parseInt(process.env.CACHE_MAX_MEMORY_MB || '100', 10)
    }

    this.startGarbageCollection()
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  /**
   * データをキャッシュに保存
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.config.defaultTtl)

    // メモリ使用量チェック
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest()
    }

    this.cache.set(key, {
      data,
      expiresAt,
      hits: 0,
      createdAt: Date.now()
    })

    centralLogger.debug('Cache set', { key, ttl, expiresAt })
  }

  /**
   * データをキャッシュから取得
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      centralLogger.debug('Cache miss', { key })
      return null
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key)
      this.misses++
      centralLogger.debug('Cache expired', { key })
      return null
    }

    entry.hits++
    this.hits++
    centralLogger.debug('Cache hit', { key, hits: entry.hits })

    return entry.data as T
  }

  /**
   * データがキャッシュに存在するかチェック
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * キャッシュからデータを削除
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key)
    centralLogger.debug('Cache delete', { key, success: result })
    return result
  }

  /**
   * キーのパターンでデータを削除
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp(pattern)
    let count = 0

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        count++
      }
    }

    centralLogger.debug('Cache pattern delete', { pattern, count })
    return count
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
    centralLogger.info('Cache cleared')
  }

  /**
   * 期限切れエントリを削除
   */
  private evictExpired(): number {
    const now = Date.now()
    let count = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key)
        count++
      }
    }

    return count
  }

  /**
   * 最も古いエントリを削除（LRU）
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      centralLogger.debug('Cache evicted oldest', { key: oldestKey })
    }
  }

  /**
   * ガベージコレクションの開始
   */
  private startGarbageCollection(): void {
    // サーバレス環境チェック
    const isServerless =
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY ||
      process.env.NODE_ENV === 'test'

    if (!isServerless) {
      this.gcInterval = setInterval(() => {
        const evicted = this.evictExpired()
        const memoryUsage = this.getMemoryUsage()

        if (evicted > 0) {
          centralLogger.debug('Cache garbage collection', { evicted, memoryUsage })
        }

        // メモリ使用量が制限を超えた場合の緊急削除
        if (memoryUsage > this.config.maxMemoryMB) {
          this.emergencyCleanup()
        }
      }, this.config.gcInterval)

      // プロセス終了時にクリア
      if (typeof process !== 'undefined') {
        process.on('beforeExit', () => {
          if (this.gcInterval) {
            clearInterval(this.gcInterval)
          }
        })
      }
    }
  }

  /**
   * 緊急クリーンアップ
   */
  private emergencyCleanup(): void {
    const targetSize = Math.floor(this.cache.size * 0.5)
    const toDelete: string[] = []

    // ヒット数の少ないエントリから削除
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.hits - b.hits)

    for (let i = 0; i < entries.length - targetSize; i++) {
      toDelete.push(entries[i][0])
    }

    toDelete.forEach(key => this.cache.delete(key))

    centralLogger.warn('Emergency cache cleanup', {
      deleted: toDelete.length,
      remaining: this.cache.size
    })
  }

  /**
   * メモリ使用量を概算（MB）
   */
  private getMemoryUsage(): number {
    const entrySize = 1024 // 1エントリあたりの概算サイズ（バイト）
    return (this.cache.size * entrySize) / (1024 * 1024)
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values())
    const createdTimes = entries.map(e => e.createdAt)

    return {
      totalEntries: this.cache.size,
      hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0,
      memoryUsage: this.getMemoryUsage(),
      oldestEntry: createdTimes.length > 0 ? Math.min(...createdTimes) : 0,
      newestEntry: createdTimes.length > 0 ? Math.max(...createdTimes) : 0
    }
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval)
      this.gcInterval = null
    }
    this.clear()
  }
}

/**
 * APIキー特化のキャッシュマネージャー
 */
export class ApiKeyCache {
  private static instance: ApiKeyCache
  private cacheManager: CacheManager
  private readonly KEY_PREFIX = 'apikey:'
  private readonly METADATA_PREFIX = 'meta:'
  private readonly VALIDATION_PREFIX = 'valid:'

  private constructor() {
    this.cacheManager = CacheManager.getInstance()
  }

  static getInstance(): ApiKeyCache {
    if (!ApiKeyCache.instance) {
      ApiKeyCache.instance = new ApiKeyCache()
    }
    return ApiKeyCache.instance
  }

  /**
   * APIキーメタデータをキャッシュ
   */
  setKeyMetadata(apiKey: string, metadata: any, ttl?: number): void {
    const key = this.METADATA_PREFIX + this.hashKey(apiKey)
    this.cacheManager.set(key, metadata, ttl || 300000) // 5分
  }

  /**
   * APIキーメタデータを取得
   */
  getKeyMetadata(apiKey: string): any | null {
    const key = this.METADATA_PREFIX + this.hashKey(apiKey)
    return this.cacheManager.get(key)
  }

  /**
   * APIキー検証結果をキャッシュ
   */
  setValidationResult(apiKey: string, isValid: boolean, ttl?: number): void {
    const key = this.VALIDATION_PREFIX + this.hashKey(apiKey)
    this.cacheManager.set(key, { isValid, timestamp: Date.now() }, ttl || 60000) // 1分
  }

  /**
   * APIキー検証結果を取得
   */
  getValidationResult(apiKey: string): { isValid: boolean; timestamp: number } | null {
    const key = this.VALIDATION_PREFIX + this.hashKey(apiKey)
    return this.cacheManager.get(key)
  }

  /**
   * 特定のAPIキーに関連するキャッシュを削除
   */
  invalidateKey(apiKey: string): void {
    const hashedKey = this.hashKey(apiKey)
    this.cacheManager.delete(this.METADATA_PREFIX + hashedKey)
    this.cacheManager.delete(this.VALIDATION_PREFIX + hashedKey)
  }

  /**
   * すべてのAPIキーキャッシュを削除
   */
  invalidateAll(): void {
    this.cacheManager.deletePattern('^(meta:|valid:)')
  }

  /**
   * APIキーをハッシュ化（セキュリティのため）
   */
  private hashKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16)
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): {
    metadata: number
    validation: number
    overall: CacheStats
  } {
    const allKeys = Array.from((this.cacheManager as any).cache.keys()) as string[]
    const metadataCount = allKeys.filter(k => k.startsWith(this.METADATA_PREFIX)).length
    const validationCount = allKeys.filter(k => k.startsWith(this.VALIDATION_PREFIX)).length

    return {
      metadata: metadataCount,
      validation: validationCount,
      overall: this.cacheManager.getStats()
    }
  }
}

/**
 * Get-or-Set パターンのヘルパー
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cache = CacheManager.getInstance()

  // キャッシュから取得を試行
  const cached = cache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // キャッシュにない場合は取得してキャッシュ
  try {
    const data = await fetcher()
    cache.set(key, data, ttl)
    return data
  } catch (error) {
    centralLogger.error('Failed to fetch data for cache', error, { key })
    throw error
  }
}

/**
 * APIキー専用のGet-or-Set
 */
export async function getCachedApiKeyData<T>(
  apiKey: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cache = ApiKeyCache.getInstance()

  // キャッシュから取得を試行
  const cached = cache.getKeyMetadata(apiKey)
  if (cached !== null) {
    return cached as T
  }

  // キャッシュにない場合は取得してキャッシュ
  try {
    const data = await fetcher()
    cache.setKeyMetadata(apiKey, data, ttl)
    return data
  } catch (error) {
    centralLogger.error('Failed to fetch API key data for cache', error)
    throw error
  }
}

// シングルトンインスタンスをエクスポート
export const cacheManager = CacheManager.getInstance()
export const apiKeyCache = ApiKeyCache.getInstance()