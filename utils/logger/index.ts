/**
 * Structured Logging System for Vercel Logs Integration
 *
 * Usage:
 *   // Server-side (API routes, webhooks)
 *   import { logger, extractRequestId } from '@/utils/logger';
 *
 *   export async function POST(req: NextRequest) {
 *     await extractRequestId();
 *     logger.info('Request received', { userId: '123' });
 *   }
 *
 *   // Client-side (React components)
 *   import { logger } from '@/utils/logger/client';
 *
 *   logger.info('Button clicked', { buttonId: 'submit' });
 */

// Re-export server-side logger and utilities
export { logger, log, setRequestId, getRequestId, clearRequestId } from './server';
export { extractRequestId } from './request';
export { maskEmail, redactSensitiveData } from './pii';

// Re-export types
export type {
  LogLevel,
  LogEntry,
  StripeLogContext,
  ErrorContext,
} from './types';
