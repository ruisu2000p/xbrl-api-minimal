/**
 * Configuration Manager
 * 環境変数と設定を一元管理
 */

export class ConfigManager {
  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  /**
   * 設定をロード
   */
  loadConfig() {
    return {
      // API設定
      api: {
        url: process.env.XBRL_API_URL || 'https://xbrl-api-minimal.vercel.app',
        key: process.env.XBRL_API_KEY || '',
        timeout: parseInt(process.env.API_TIMEOUT || '30000'),
        retries: parseInt(process.env.API_RETRIES || '3'),
      },
      
      // Supabase設定（将来の拡張用）
      supabase: {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
        serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
      },
      
      // キャッシュ設定
      cache: {
        enabled: process.env.CACHE_ENABLED !== 'false',
        ttl: parseInt(process.env.CACHE_TTL || '300000'), // 5分
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || '100'),
      },
      
      // レート制限設定
      rateLimit: {
        enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '3600000'), // 1時間
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      },
      
      // ログ設定
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json',
      },
      
      // 環境設定
      environment: {
        mode: process.env.NODE_ENV || 'production',
        debug: process.env.DEBUG === 'true',
      }
    };
  }

  /**
   * 設定を検証
   */
  validateConfig() {
    const errors = [];

    // API URLの検証
    if (!this.config.api.url) {
      errors.push('XBRL_API_URL is not configured');
    } else {
      try {
        new URL(this.config.api.url);
      } catch (e) {
        errors.push('XBRL_API_URL is not a valid URL');
      }
    }

    // タイムアウトの検証
    if (this.config.api.timeout < 1000 || this.config.api.timeout > 300000) {
      errors.push('API_TIMEOUT must be between 1000 and 300000 ms');
    }

    // キャッシュ設定の検証
    if (this.config.cache.ttl < 0) {
      errors.push('CACHE_TTL must be positive');
    }

    if (errors.length > 0) {
      console.error('[CONFIG] Validation errors:', errors);
      if (this.config.environment.mode === 'production') {
        throw new Error('Configuration validation failed: ' + errors.join(', '));
      }
    }
  }

  /**
   * API設定を取得
   */
  getApiConfig() {
    return this.config.api;
  }

  /**
   * キャッシュ設定を取得
   */
  getCacheConfig() {
    return this.config.cache;
  }

  /**
   * レート制限設定を取得
   */
  getRateLimitConfig() {
    return this.config.rateLimit;
  }

  /**
   * 特定の設定値を取得
   */
  get(path) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * 設定値を設定（テスト用）
   */
  set(path, value) {
    const keys = path.split('.');
    let obj = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in obj) || typeof obj[key] !== 'object') {
        obj[key] = {};
      }
      obj = obj[key];
    }
    
    obj[keys[keys.length - 1]] = value;
  }

  /**
   * 環境情報を取得
   */
  getEnvironment() {
    return this.config.environment;
  }

  /**
   * デバッグモードかチェック
   */
  isDebug() {
    return this.config.environment.debug;
  }

  /**
   * 設定サマリーを取得
   */
  getSummary() {
    return {
      api_url: this.config.api.url,
      api_key_configured: !!this.config.api.key,
      cache_enabled: this.config.cache.enabled,
      rate_limit_enabled: this.config.rateLimit.enabled,
      environment: this.config.environment.mode,
      debug: this.config.environment.debug,
    };
  }
}

// シングルトンインスタンス
export const config = new ConfigManager();