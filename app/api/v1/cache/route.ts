// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getCache, invalidateCacheByTags } from '@/lib/utils/cache-system';
import { getStorageOptimizer } from '@/lib/utils/storage-optimizer';

// GET /api/v1/cache - キャッシュ統計情報取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const include_keys = searchParams.get('include_keys') === 'true';
    const pattern = searchParams.get('pattern') || '*';
    const popular_limit = parseInt(searchParams.get('popular_limit') || '10');

    const cache = getCache();
    const storageOptimizer = getStorageOptimizer();

    // 基本統計
    const stats = cache.getStats();
    
    // 人気キー
    const popularKeys = cache.getPopularKeys(popular_limit);
    
    // パターンに一致するキー（オプション）
    let matchingKeys: string[] = [];
    if (include_keys) {
      matchingKeys = cache.keys(pattern);
    }

    // ストレージオプティマイザーの統計
    const storageStats = storageOptimizer.getCacheStats();

    // クリーンアップ実行
    const expiredCount = cache.cleanup();

    return NextResponse.json({
      success: true,
      cache_stats: {
        ...stats,
        size_mb: (stats.total_size / 1024 / 1024).toFixed(2),
        hit_rate_percentage: (stats.hit_rate * 100).toFixed(2),
        expired_cleaned: expiredCount
      },
      storage_optimizer_stats: {
        ...storageStats,
        total_size_mb: (storageStats.totalSize / 1024 / 1024).toFixed(2),
        oldest_item_age_minutes: storageStats.oldestItem 
          ? Math.floor((Date.now() - storageStats.oldestItem) / 60000) 
          : 0,
        newest_item_age_minutes: storageStats.newestItem 
          ? Math.floor((Date.now() - storageStats.newestItem) / 60000) 
          : 0
      },
      popular_keys: popularKeys,
      matching_keys: include_keys ? {
        pattern,
        count: matchingKeys.length,
        keys: matchingKeys.slice(0, 50) // 最初の50個のみ
      } : null,
      status: 200
    });

  } catch (error) {
    console.error('Cache stats API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 500
      },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/cache - キャッシュクリア・無効化
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'clear_expired';
    const pattern = searchParams.get('pattern');
    const tags = searchParams.get('tags')?.split(',') || [];
    const key = searchParams.get('key');

    const cache = getCache();
    const storageOptimizer = getStorageOptimizer();
    
    let result: any = {
      success: true,
      action,
      affected_items: 0
    };

    switch (action) {
      case 'clear_all':
        // 全キャッシュクリア
        cache.clear();
        storageOptimizer.clearCache();
        result.message = 'All caches cleared';
        break;

      case 'clear_expired':
        // 期限切れキャッシュのみクリア
        const expiredCount = cache.cleanup();
        const storageExpiredCount = storageOptimizer.cleanExpiredCache();
        result.affected_items = expiredCount + storageExpiredCount;
        result.message = `${result.affected_items} expired items cleared`;
        break;

      case 'clear_pattern':
        // パターンに一致するキーを削除
        if (!pattern) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Pattern is required for pattern-based clearing',
              status: 400
            },
            { status: 400 }
          );
        }
        const patternDeletedCount = await cache.delPattern(pattern);
        storageOptimizer.clearCache(pattern);
        result.affected_items = patternDeletedCount;
        result.pattern = pattern;
        result.message = `${result.affected_items} items matching '${pattern}' cleared`;
        break;

      case 'clear_tags':
        // タグベースの無効化
        if (tags.length === 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Tags are required for tag-based clearing',
              status: 400
            },
            { status: 400 }
          );
        }
        const tagDeletedCount = await invalidateCacheByTags(tags);
        result.affected_items = tagDeletedCount;
        result.tags = tags;
        result.message = `${result.affected_items} items with tags [${tags.join(', ')}] cleared`;
        break;

      case 'clear_key':
        // 特定キーを削除
        if (!key) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Key is required for key-based clearing',
              status: 400
            },
            { status: 400 }
          );
        }
        const keyDeleted = await cache.del(key);
        result.affected_items = keyDeleted ? 1 : 0;
        result.key = key;
        result.message = keyDeleted ? `Key '${key}' cleared` : `Key '${key}' not found`;
        break;

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: `Unknown action: ${action}. Valid actions: clear_all, clear_expired, clear_pattern, clear_tags, clear_key`,
            status: 400
          },
          { status: 400 }
        );
    }

    // 操作後の統計を取得
    const newStats = cache.getStats();
    result.cache_stats_after = {
      total_keys: newStats.total_keys,
      total_size_mb: (newStats.total_size / 1024 / 1024).toFixed(2),
      hit_rate_percentage: (newStats.hit_rate * 100).toFixed(2)
    };

    result.status = 200;
    return NextResponse.json(result);

  } catch (error) {
    console.error('Cache clear API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 500
      },
      { status: 500 }
    );
  }
}

// POST /api/v1/cache - キャッシュ設定・プリロード
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    const cache = getCache();
    
    let result: any = {
      success: true,
      action
    };

    switch (action) {
      case 'preload':
        // データをプリロード
        if (!data || !Array.isArray(data)) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Data array is required for preloading',
              status: 400
            },
            { status: 400 }
          );
        }

        let preloadedCount = 0;
        for (const item of data) {
          if (item.key && item.value) {
            const success = await cache.set(item.key, item.value, item.ttl);
            if (success) preloadedCount++;
          }
        }

        result.preloaded_items = preloadedCount;
        result.message = `${preloadedCount} items preloaded`;
        break;

      case 'set':
        // 単一キー設定
        if (!data || !data.key || data.value === undefined) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Key and value are required',
              status: 400
            },
            { status: 400 }
          );
        }

        const setSuccess = await cache.set(data.key, data.value, data.ttl);
        result.success = setSuccess;
        result.key = data.key;
        result.message = setSuccess ? 'Key set successfully' : 'Failed to set key';
        break;

      case 'extend_ttl':
        // TTL延長
        if (!data || !data.key || !data.ttl) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Key and TTL are required',
              status: 400
            },
            { status: 400 }
          );
        }

        const extendSuccess = cache.expire(data.key, data.ttl);
        result.success = extendSuccess;
        result.key = data.key;
        result.new_ttl = data.ttl;
        result.message = extendSuccess ? 'TTL extended successfully' : 'Key not found or expired';
        break;

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: `Unknown action: ${action}. Valid actions: preload, set, extend_ttl`,
            status: 400
          },
          { status: 400 }
        );
    }

    result.status = 200;
    return NextResponse.json(result);

  } catch (error) {
    console.error('Cache operation API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 500
      },
      { status: 500 }
    );
  }
}