/**
 * Application Constants
 */

// API Configuration
export const API_VERSION = 'v1';
export const API_BASE_PATH = `/api/${API_VERSION}`;

// Rate Limiting
export const RATE_LIMITS = {
  FREE: {
    REQUESTS_PER_MINUTE: 10,
    REQUESTS_PER_HOUR: 100,
    REQUESTS_PER_DAY: 1000,
  },
  BASIC: {
    REQUESTS_PER_MINUTE: 30,
    REQUESTS_PER_HOUR: 500,
    REQUESTS_PER_DAY: 5000,
  },
  PRO: {
    REQUESTS_PER_MINUTE: 100,
    REQUESTS_PER_HOUR: 2000,
    REQUESTS_PER_DAY: 20000,
  },
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const;

// Cache TTL (in seconds)
export const CACHE_TTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 3600,       // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// Storage
export const STORAGE = {
  BUCKET_NAME: 'markdown-files',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['text/markdown', 'text/plain'],
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: '認証が必要です',
  FORBIDDEN: 'アクセス権限がありません',
  NOT_FOUND: 'リソースが見つかりません',
  RATE_LIMITED: 'レート制限に達しました',
  INVALID_REQUEST: '無効なリクエストです',
  INTERNAL_ERROR: 'サーバーエラーが発生しました',
  INVALID_API_KEY: '無効なAPIキーです',
  EXPIRED_API_KEY: 'APIキーの有効期限が切れています',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  CREATED: 'リソースが作成されました',
  UPDATED: 'リソースが更新されました',
  DELETED: 'リソースが削除されました',
  FETCHED: 'データを取得しました',
} as const;

// Fiscal Years
export const FISCAL_YEARS = [
  'FY2016',
  'FY2017',
  'FY2018',
  'FY2019',
  'FY2020',
  'FY2021',
  'FY2022',
  'FY2023',
  'FY2024',
  'FY2025',
] as const;

// Document Types
export const DOCUMENT_TYPES = {
  PUBLIC: 'PublicDoc',
  AUDIT: 'AuditDoc',
} as const;

// Regex Patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  API_KEY: /^(?:[0-9a-fA-F-]{36}\.[A-Za-z0-9]{16,}|xbrl_[A-Za-z0-9]{16,})$/,
  COMPANY_ID: /^S[0-9A-Z]{7}$/,
  TICKER_CODE: /^\d{4}$/,
} as const;