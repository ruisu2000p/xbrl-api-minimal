import { createClient } from '@supabase/supabase-js';

// キャッシュエントリの型定義
interface CacheEntry {
  key: string;
  value: any;
  ttl: number; // 有効期限（Unix timestamp）
  created_at: number;
  accessed_at: number;
  hit_count: number;
  size: number; // バイト数
}

// キャッシュ統計の型定義
interface CacheStats {
  total_keys: number;
  total_size: number;
  hit_count: number;
  miss_count: number;
  hit_rate: number;
  expired_keys: number;
  average_ttl: number;
}

// キャッシュ設定の型定義
interface CacheConfig {
  maxSize: number; // 最大キャッシュサイズ（バイト）
  maxKeys: number; // 最大キー数
  defaultTTL: number; // デフォルトTTL（秒）
  cleanupInterval: number; // クリーンアップ間隔（秒）
  enablePersistence: boolean; // Supabaseへの永続化
}

// LRU キャッシュシステム
export class AdvancedCacheSystem {
  private cache: Map<string, CacheEntry> = new Map();
  private hitCount: number = 0;
  private missCount: number = 0;
  private config: CacheConfig;
  private supabase: any;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 50 * 1024 * 1024, // 50MB
      maxKeys: config.maxKeys || 1000,
      defaultTTL: config.defaultTTL || 3600, // 1時間
      cleanupInterval: config.cleanupInterval || 300, // 5分
      enablePersistence: config.enablePersistence || false,
      ...config
    };

    if (this.config.enablePersistence) {
      const supabaseUrl = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    }

    this.startCleanupTimer();
  }

  // クリーンアップタイマーを開始
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval * 1000);
  }

  // タイマーを停止
  public stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // データサイズを計算
  private calculateSize(value: any): number {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  }

  // TTLをUnixタイムスタンプに変換
  private getTTLTimestamp(ttlSeconds?: number): number {
    const ttl = ttlSeconds || this.config.defaultTTL;
    return Date.now() + (ttl * 1000);
  }

  // キーが期限切れかチェック
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.ttl;
  }

  // LRU eviction - 最も使用されていないアイテムを削除
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.accessed_at < oldestTime) {
        oldestTime = entry.accessed_at;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // サイズベースの eviction
  private evictBySize(): void {
    let currentSize = this.getTotalSize();
    
    while (currentSize > this.config.maxSize && this.cache.size > 0) {
      this.evictLRU();
      currentSize = this.getTotalSize();
    }
  }

  // 現在の総サイズを取得
  private getTotalSize(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  // 値を設定
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const size = this.calculateSize(value);
      const ttl = this.getTTLTimestamp(ttlSeconds);
      const now = Date.now();

      const entry: CacheEntry = {
        key,
        value,
        ttl,
        created_at: now,
        accessed_at: now,
        hit_count: 0,
        size
      };

      // サイズとキー数の制限チェック
      if (this.cache.size >= this.config.maxKeys) {
        this.evictLRU();
      }

      this.cache.set(key, entry);
      this.evictBySize();

      // 永続化が有効な場合
      if (this.config.enablePersistence && this.supabase) {
        await this.persistToDatabase(entry);
      }

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // 値を取得
  async get(key: string): Promise<any | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      
      // 永続化から復元を試行
      if (this.config.enablePersistence && this.supabase) {
        const restoredEntry = await this.restoreFromDatabase(key);
        if (restoredEntry) {
          this.cache.set(key, restoredEntry);
          this.hitCount++;
          return restoredEntry.value;
        }
      }
      
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // アクセス情報を更新
    entry.accessed_at = Date.now();
    entry.hit_count++;
    this.hitCount++;

    return entry.value;
  }

  // 複数キーの値を取得
  async mget(keys: string[]): Promise<{ [key: string]: any }> {
    const results: { [key: string]: any } = {};
    
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get(key);
        if (value !== null) {
          results[key] = value;
        }
      })
    );

    return results;
  }

  // 複数キーに値を設定
  async mset(entries: { [key: string]: any }, ttlSeconds?: number): Promise<boolean> {
    try {
      await Promise.all(
        Object.entries(entries).map(([key, value]) =>
          this.set(key, value, ttlSeconds)
        )
      );
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  // キーを削除
  async del(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    
    if (this.config.enablePersistence && this.supabase) {
      await this.deleteFromDatabase(key);
    }
    
    return deleted;
  }

  // パターンに一致するキーを削除
  async delPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        await this.del(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  // キーの存在確認
  exists(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  // TTLを設定
  expire(key: string, ttlSeconds: number): boolean {
    const entry = this.cache.get(key);
    if (!entry || this.isExpired(entry)) {
      return false;
    }
    
    entry.ttl = this.getTTLTimestamp(ttlSeconds);
    return true;
  }

  // TTLを取得
  ttl(key: string): number {
    const entry = this.cache.get(key);
    if (!entry || this.isExpired(entry)) {
      return -1;
    }
    
    return Math.floor((entry.ttl - Date.now()) / 1000);
  }

  // パターンに一致するキーを取得
  keys(pattern: string = '*'): string[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const matchingKeys: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (regex.test(key) && !this.isExpired(entry)) {
        matchingKeys.push(key);
      }
    }
    
    return matchingKeys;
  }

  // 期限切れキーを削除
  cleanup(): number {
    let expiredCount = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (now > entry.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    return expiredCount;
  }

  // 全キャッシュをクリア
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  // キャッシュサイズを取得
  size(): number {
    return this.cache.size;
  }

  // 統計情報を取得
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    let totalSize = 0;
    let totalTTL = 0;
    let expiredKeys = 0;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      totalSize += entry.size;
      totalTTL += Math.max(0, entry.ttl - now);
      if (this.isExpired(entry)) {
        expiredKeys++;
      }
    }

    return {
      total_keys: this.cache.size,
      total_size: totalSize,
      hit_count: this.hitCount,
      miss_count: this.missCount,
      hit_rate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      expired_keys: expiredKeys,
      average_ttl: this.cache.size > 0 ? totalTTL / this.cache.size / 1000 : 0
    };
  }

  // 人気キーを取得
  getPopularKeys(limit: number = 10): Array<{ key: string; hits: number }> {
    const keyHits = Array.from(this.cache.entries())
      .filter(([_, entry]) => !this.isExpired(entry))
      .map(([key, entry]) => ({ key, hits: entry.hit_count }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);

    return keyHits;
  }

  // Supabaseに永続化
  private async persistToDatabase(entry: CacheEntry): Promise<void> {
    try {
      await this.supabase
        .from('cache_entries')
        .upsert({
          key: entry.key,
          value: entry.value,
          ttl: new Date(entry.ttl).toISOString(),
          created_at: new Date(entry.created_at).toISOString(),
          size: entry.size
        });
    } catch (error) {
      console.error('Cache persistence error:', error);
    }
  }

  // Supabaseから復元
  private async restoreFromDatabase(key: string): Promise<CacheEntry | null> {
    try {
      const { data, error } = await this.supabase
        .from('cache_entries')
        .select('*')
        .eq('key', key)
        .single();

      if (error || !data) return null;

      const entry: CacheEntry = {
        key: data.key,
        value: data.value,
        ttl: new Date(data.ttl).getTime(),
        created_at: new Date(data.created_at).getTime(),
        accessed_at: Date.now(),
        hit_count: 0,
        size: data.size
      };

      // 期限切れチェック
      if (this.isExpired(entry)) {
        await this.deleteFromDatabase(key);
        return null;
      }

      return entry;
    } catch (error) {
      console.error('Cache restore error:', error);
      return null;
    }
  }

  // Supabaseから削除
  private async deleteFromDatabase(key: string): Promise<void> {
    try {
      await this.supabase
        .from('cache_entries')
        .delete()
        .eq('key', key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }
}

// グローバルキャッシュインスタンス
let globalCache: AdvancedCacheSystem | null = null;

export function getCache(config?: Partial<CacheConfig>): AdvancedCacheSystem {
  if (!globalCache) {
    globalCache = new AdvancedCacheSystem(config);
  }
  return globalCache;
}

// 便利なヘルパー関数
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  const cache = getCache();
  
  // キャッシュから取得を試行
  const cached = await cache.get(key);
  if (cached !== null) {
    return cached;
  }
  
  // データを取得してキャッシュに保存
  const data = await fetcher();
  await cache.set(key, data, ttlSeconds);
  
  return data;
}

// 財務データ専用のキャッシュキー生成
export function generateFinancialCacheKey(
  type: 'metrics' | 'document' | 'analysis',
  companyId: string,
  ...params: string[]
): string {
  return `financial:${type}:${companyId}:${params.join(':')}`;
}

// タグベースのキャッシュ無効化
export async function invalidateCacheByTags(tags: string[]): Promise<number> {
  const cache = getCache();
  let invalidatedCount = 0;
  
  for (const tag of tags) {
    const count = await cache.delPattern(`*:${tag}:*`);
    invalidatedCount += count;
  }
  
  return invalidatedCount;
}