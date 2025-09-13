import { createClient } from '@supabase/supabase-js';

// Supabase環境変数
const supabaseUrl = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';

// キャッシュインターfaces
interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface StorageCache {
  [key: string]: CacheItem;
}

// ストレージ最適化クラス
export class StorageOptimizer {
  private cache: StorageCache = {};
  private supabase;
  private defaultTTL: number;
  private maxCacheSize: number;

  constructor(options: {
    defaultTTL?: number; // デフォルト30分
    maxCacheSize?: number; // デフォルト100アイテム
  } = {}) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    this.defaultTTL = options.defaultTTL || 30 * 60 * 1000; // 30分
    this.maxCacheSize = options.maxCacheSize || 100;
  }

  // キャッシュキーを生成
  private generateCacheKey(storagePath: string, options?: any): string {
    const baseKey = `storage:${storagePath}`;
    if (options) {
      const optionsStr = JSON.stringify(options);
      return `${baseKey}:${Buffer.from(optionsStr).toString('base64')}`;
    }
    return baseKey;
  }

  // キャッシュからデータを取得
  private getFromCache(key: string): any | null {
    const item = this.cache[key];
    if (!item) return null;

    const now = Date.now();
    if (now > item.timestamp + item.ttl) {
      delete this.cache[key];
      return null;
    }

    return item.data;
  }

  // キャッシュにデータを保存
  private setToCache(key: string, data: any, ttl?: number): void {
    // キャッシュサイズ制限
    if (Object.keys(this.cache).length >= this.maxCacheSize) {
      this.evictOldestItems(10); // 古いアイテム10個を削除
    }

    this.cache[key] = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };
  }

  // 古いキャッシュアイテムを削除
  private evictOldestItems(count: number): void {
    const items = Object.entries(this.cache)
      .map(([key, value]) => ({ key, timestamp: value.timestamp }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, count);

    items.forEach(item => {
      delete this.cache[item.key];
    });
  }

  // ファイルサイズを効率的に取得
  async getFileSize(storagePath: string): Promise<number | null> {
    const cacheKey = `size:${storagePath}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) return cached;

    try {
      const { data, error } = await this.supabase.storage
        .from('markdown-files')
        .list(storagePath.split('/').slice(0, -1).join('/'), {
          search: storagePath.split('/').pop()
        });

      if (error || !data || data.length === 0) return null;

      const fileSize = data[0].metadata?.size || null;
      if (fileSize !== null) {
        this.setToCache(cacheKey, fileSize, 60 * 60 * 1000); // 1時間キャッシュ
      }

      return fileSize;
    } catch (error) {
      console.error('Error getting file size:', error);
      return null;
    }
  }

  // ファイルコンテンツを効率的に取得
  async getFileContent(
    storagePath: string, 
    options: {
      maxLength?: number;
      useCache?: boolean;
      ttl?: number;
    } = {}
  ): Promise<string | null> {
    const { maxLength, useCache = true, ttl } = options;
    const cacheKey = this.generateCacheKey(storagePath, { maxLength });

    // キャッシュチェック
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached !== null) return cached;
    }

    try {
      const { data: fileData, error } = await this.supabase.storage
        .from('markdown-files')
        .download(storagePath);

      if (error || !fileData) {
        console.error(`Storage download error for ${storagePath}:`, error);
        return null;
      }

      let content = await fileData.text();

      // 長さ制限を適用
      if (maxLength && content.length > maxLength) {
        content = content.substring(0, maxLength);
      }

      // キャッシュに保存
      if (useCache) {
        this.setToCache(cacheKey, content, ttl);
      }

      return content;
    } catch (error) {
      console.error(`Error fetching content for ${storagePath}:`, error);
      return null;
    }
  }

  // ファイルコンテンツを部分的に取得（プレビュー用）
  async getFilePreview(
    storagePath: string, 
    previewLength: number = 1000
  ): Promise<{
    preview: string;
    totalSize: number | null;
    isTruncated: boolean;
  } | null> {
    const cacheKey = `preview:${storagePath}:${previewLength}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) return cached;

    try {
      // ファイルサイズを取得
      const totalSize = await this.getFileSize(storagePath);
      
      // プレビューコンテンツを取得
      const content = await this.getFileContent(storagePath, {
        maxLength: previewLength,
        useCache: false // プレビューは別でキャッシュ
      });

      if (content === null) return null;

      const result = {
        preview: content,
        totalSize,
        isTruncated: totalSize ? content.length < totalSize : false
      };

      // プレビューは長時間キャッシュ
      this.setToCache(cacheKey, result, 2 * 60 * 60 * 1000); // 2時間

      return result;
    } catch (error) {
      console.error(`Error getting preview for ${storagePath}:`, error);
      return null;
    }
  }

  // 複数ファイルを並列取得
  async getMultipleFiles(
    storagePaths: string[],
    options: {
      maxLength?: number;
      concurrency?: number;
      useCache?: boolean;
    } = {}
  ): Promise<{ [path: string]: string | null }> {
    const { concurrency = 5, ...fileOptions } = options;
    const results: { [path: string]: string | null } = {};

    // 並列度制限を使って処理
    for (let i = 0; i < storagePaths.length; i += concurrency) {
      const batch = storagePaths.slice(i, i + concurrency);
      const batchPromises = batch.map(async (path) => {
        const content = await this.getFileContent(path, fileOptions);
        return { path, content };
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results[result.value.path] = result.value.content;
        } else {
          results[batch[batchResults.indexOf(result)]] = null;
        }
      });
    }

    return results;
  }

  // ストレージ内のファイル一覧を効率的に取得
  async listFiles(
    folderPath: string,
    options: {
      limit?: number;
      offset?: number;
      useCache?: boolean;
      sortBy?: 'name' | 'updated_at' | 'created_at';
    } = {}
  ): Promise<any[] | null> {
    const { limit = 100, offset = 0, useCache = true, sortBy = 'name' } = options;
    const cacheKey = `list:${folderPath}:${limit}:${offset}:${sortBy}`;

    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached !== null) return cached;
    }

    try {
      const { data, error } = await this.supabase.storage
        .from('markdown-files')
        .list(folderPath, {
          limit,
          offset,
          sortBy: { column: sortBy, order: 'asc' }
        });

      if (error) {
        console.error(`Storage list error for ${folderPath}:`, error);
        return null;
      }

      if (useCache) {
        this.setToCache(cacheKey, data, 15 * 60 * 1000); // 15分キャッシュ
      }

      return data;
    } catch (error) {
      console.error(`Error listing files in ${folderPath}:`, error);
      return null;
    }
  }

  // キャッシュ統計を取得
  getCacheStats(): {
    totalItems: number;
    totalSize: number;
    hitRate: number;
    oldestItem: number;
    newestItem: number;
  } {
    const items = Object.values(this.cache);
    const now = Date.now();
    
    let totalSize = 0;
    let oldestTimestamp = now;
    let newestTimestamp = 0;

    items.forEach(item => {
      totalSize += JSON.stringify(item.data).length;
      oldestTimestamp = Math.min(oldestTimestamp, item.timestamp);
      newestTimestamp = Math.max(newestTimestamp, item.timestamp);
    });

    return {
      totalItems: items.length,
      totalSize,
      hitRate: 0, // TODO: 実装が必要な場合
      oldestItem: oldestTimestamp,
      newestItem: newestTimestamp
    };
  }

  // キャッシュをクリア
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache = {};
      return;
    }

    Object.keys(this.cache).forEach(key => {
      if (key.includes(pattern)) {
        delete this.cache[key];
      }
    });
  }

  // 期限切れキャッシュを削除
  cleanExpiredCache(): number {
    const now = Date.now();
    let removedCount = 0;

    Object.entries(this.cache).forEach(([key, item]) => {
      if (now > item.timestamp + item.ttl) {
        delete this.cache[key];
        removedCount++;
      }
    });

    return removedCount;
  }

  // バッチファイル処理（大量ファイル処理用）
  async processBatchFiles(
    storagePaths: string[],
    processor: (content: string, path: string) => Promise<any>,
    options: {
      batchSize?: number;
      concurrency?: number;
      onProgress?: (completed: number, total: number) => void;
      onError?: (error: any, path: string) => void;
    } = {}
  ): Promise<any[]> {
    const { 
      batchSize = 10, 
      concurrency = 3,
      onProgress,
      onError 
    } = options;

    const results: any[] = [];
    let completed = 0;

    for (let i = 0; i < storagePaths.length; i += batchSize) {
      const batch = storagePaths.slice(i, i + batchSize);
      
      // ファイルコンテンツを並列取得
      const contents = await this.getMultipleFiles(batch, { concurrency });
      
      // 処理を並列実行
      const processingPromises = batch.map(async (path) => {
        try {
          const content = contents[path];
          if (content === null) {
            throw new Error(`Failed to get content for ${path}`);
          }
          
          const result = await processor(content, path);
          completed++;
          
          if (onProgress) {
            onProgress(completed, storagePaths.length);
          }
          
          return result;
        } catch (error) {
          if (onError) {
            onError(error, path);
          }
          completed++;
          return null;
        }
      });

      const batchResults = await Promise.allSettled(processingPromises);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push(null);
        }
      });
    }

    return results;
  }
}

// グローバルインスタンス（シングルトン）
let globalStorageOptimizer: StorageOptimizer | null = null;

export function getStorageOptimizer(options?: any): StorageOptimizer {
  if (!globalStorageOptimizer) {
    globalStorageOptimizer = new StorageOptimizer(options);
  }
  return globalStorageOptimizer;
}

// ユーティリティ関数
export async function getOptimizedContent(
  storagePath: string,
  maxLength?: number
): Promise<string | null> {
  const optimizer = getStorageOptimizer();
  return optimizer.getFileContent(storagePath, { maxLength });
}

export async function getContentPreview(
  storagePath: string,
  previewLength: number = 1000
): Promise<string> {
  const optimizer = getStorageOptimizer();
  const result = await optimizer.getFilePreview(storagePath, previewLength);
  
  if (!result) return '';
  
  let preview = result.preview;
  if (result.isTruncated) {
    preview += `\n\n... (${result.totalSize?.toLocaleString() || '?'}文字中${previewLength.toLocaleString()}文字を表示)`;
  }
  
  return preview;
}