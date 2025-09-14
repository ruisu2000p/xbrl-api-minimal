/**
 * Infrastructure Layer - Unified exports
 * All infrastructure components in one place
 */

// Supabase Singleton
export {
  SupabaseManager,
  supabaseManager
} from './supabase-singleton';

// Configuration Manager
export {
  ConfigManager,
  configManager,
  getConfig,
  isProduction,
  isDevelopment,
  getFeatureFlags,
  type AppConfig
} from './config-manager';

// Error Handler
export {
  ErrorHandler,
  errorHandler,
  handleError,
  asyncHandler,
  AppError,
  ErrorCode,
  type ErrorResponse
} from './error-handler';

// Health Check Service
export { HealthCheckService } from './health-check';

// Cache Manager (if needed)
export { CacheManager } from './cache-manager';