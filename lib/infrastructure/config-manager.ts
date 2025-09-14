import { logger } from '../utils/logger';

/**
 * Configuration Manager
 * Centralized environment variable management with validation and defaults
 */

export interface AppConfig {
  // Supabase
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };

  // Security
  security: {
    apiKeySecret: string;
    jwtSecret?: string;
    encryptionKey?: string;
  };

  // Application
  app: {
    url: string;
    env: 'development' | 'test' | 'production';
    port: number;
    name: string;
    version: string;
  };

  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: {
      free: number;
      standard: number;
      pro: number;
      enterprise: number;
    };
  };

  // Monitoring
  monitoring: {
    sentryDsn?: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableMetrics: boolean;
  };

  // Storage
  storage: {
    maxFileSize: number;
    allowedMimeTypes: string[];
    buckets: {
      markdown: string;
      documents: string;
    };
  };
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig | null = null;
  private validationErrors: string[] = [];

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Initialize configuration
   */
  initialize(): AppConfig {
    if (this.config) {
      return this.config;
    }

    this.config = {
      supabase: {
        url: this.getRequired('NEXT_PUBLIC_SUPABASE_URL'),
        anonKey: this.getRequired('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
        serviceRoleKey: this.getRequired('SUPABASE_SERVICE_ROLE_KEY'),
      },

      security: {
        apiKeySecret: this.getRequired('API_KEY_SECRET', this.generateDefaultSecret()),
        jwtSecret: this.getOptional('JWT_SECRET'),
        encryptionKey: this.getOptional('ENCRYPTION_KEY'),
      },

      app: {
        url: this.getOptional('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
        env: this.getEnvironment(),
        port: parseInt(this.getOptional('PORT', '3000'), 10),
        name: 'XBRL API Minimal',
        version: '4.0.0',
      },

      rateLimit: {
        windowMs: parseInt(this.getOptional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
        maxRequests: {
          free: parseInt(this.getOptional('RATE_LIMIT_FREE', '10'), 10),
          standard: parseInt(this.getOptional('RATE_LIMIT_STANDARD', '60'), 10),
          pro: parseInt(this.getOptional('RATE_LIMIT_PRO', '300'), 10),
          enterprise: parseInt(this.getOptional('RATE_LIMIT_ENTERPRISE', '1000'), 10),
        },
      },

      monitoring: {
        sentryDsn: this.getOptional('SENTRY_DSN'),
        logLevel: this.getLogLevel(),
        enableMetrics: this.getOptional('ENABLE_METRICS', 'false') === 'true',
      },

      storage: {
        maxFileSize: parseInt(this.getOptional('MAX_FILE_SIZE', '10485760'), 10), // 10MB
        allowedMimeTypes: this.getOptional('ALLOWED_MIME_TYPES', 'text/markdown,text/plain,application/json').split(','),
        buckets: {
          markdown: 'markdown-files',
          documents: 'documents',
        },
      },
    };

    this.validateConfig();

    if (this.validationErrors.length > 0) {
      const errors = this.validationErrors.join('\n');
      logger.error('Configuration validation failed:\n' + errors);

      // Don't throw error in production for warnings
      const hasErrors = this.validationErrors.some(e => !e.startsWith('WARNING:'));
      if (this.config.app.env === 'production' && hasErrors) {
        throw new Error('Configuration validation failed in production');
      }
    }

    logger.info('Configuration initialized', {
      environment: this.config.app.env,
      version: this.config.app.version,
    });

    return this.config;
  }

  /**
   * Get required environment variable
   */
  private getRequired(key: string, defaultValue?: string): string {
    const value = process.env[key] || defaultValue;

    if (!value) {
      this.validationErrors.push(`Missing required environment variable: ${key}`);
      return '';
    }

    return value;
  }

  /**
   * Get optional environment variable
   */
  private getOptional(key: string, defaultValue: string = ''): string {
    return process.env[key] || defaultValue;
  }

  /**
   * Get environment type
   */
  private getEnvironment(): 'development' | 'test' | 'production' {
    const env = process.env.NODE_ENV || 'development';

    if (env === 'test' || env === 'production') {
      return env;
    }

    return 'development';
  }

  /**
   * Get log level
   */
  private getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
    const level = process.env.LOG_LEVEL || 'info';

    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      return level as any;
    }

    return 'info';
  }

  /**
   * Generate default API key secret
   */
  private generateDefaultSecret(): string {
    // Generate a random secret
    const crypto = require('crypto');
    const secret = crypto.randomBytes(32).toString('hex');

    if (this.getEnvironment() === 'production') {
      // In production, log a warning but still return a valid secret
      // This allows the build to complete
      this.validationErrors.push('WARNING: API_KEY_SECRET should be explicitly set in production');
    }

    return secret;
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config) return;

    // Validate Supabase URLs
    if (!this.config.supabase.url.startsWith('https://')) {
      this.validationErrors.push('SUPABASE_URL must use HTTPS');
    }

    // Validate API key secret length
    if (this.config.security.apiKeySecret.length < 32) {
      this.validationErrors.push('API_KEY_SECRET must be at least 32 characters');
    }

    // Validate rate limits
    if (this.config.rateLimit.windowMs < 1000) {
      this.validationErrors.push('Rate limit window must be at least 1000ms');
    }

    // Validate port
    if (this.config.app.port < 0 || this.config.app.port > 65535) {
      this.validationErrors.push('Invalid port number');
    }
  }

  /**
   * Get configuration
   */
  getConfig(): AppConfig {
    if (!this.config) {
      return this.initialize();
    }
    return this.config;
  }

  /**
   * Update configuration (for testing)
   */
  updateConfig(updates: Partial<AppConfig>): void {
    if (this.config?.app.env === 'production') {
      throw new Error('Cannot update configuration in production');
    }

    this.config = {
      ...this.config!,
      ...updates,
    };
  }

  /**
   * Reset configuration (for testing)
   */
  reset(): void {
    if (this.config?.app.env === 'production') {
      throw new Error('Cannot reset configuration in production');
    }

    this.config = null;
    this.validationErrors = [];
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.getConfig().app.env === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return this.getConfig().app.env === 'development';
  }

  /**
   * Get feature flags
   */
  getFeatureFlags(): Record<string, boolean> {
    return {
      enableNewAuth: true,
      enableMetrics: this.config?.monitoring.enableMetrics || false,
      enableDebugLogging: this.config?.monitoring.logLevel === 'debug',
      enableRateLimiting: true,
      enableCaching: this.isProduction(),
    };
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();

// Export helper functions
export const getConfig = () => configManager.getConfig();
export const isProduction = () => configManager.isProduction();
export const isDevelopment = () => configManager.isDevelopment();
export const getFeatureFlags = () => configManager.getFeatureFlags();