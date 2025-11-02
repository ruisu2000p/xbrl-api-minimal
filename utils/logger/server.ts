/**
 * Server-side Structured Logger for Vercel Logs
 *
 * Usage:
 *   import { log } from '@/utils/logger/server';
 *
 *   log({
 *     lvl: 'info',
 *     msg: 'Subscription updated',
 *     userId: user.id,
 *     stripe: { eventId, customerId, action: 'upgrade', outcome: 'success' }
 *   });
 *
 * Features:
 * - Structured JSON output for Vercel Logs
 * - Automatic request ID extraction from x-vercel-id
 * - PII masking enforcement
 * - Type-safe log entries
 */

import type { LogEntry, LogLevel, StripeLogContext, ErrorContext } from './types';
import { maskEmail, redactSensitiveData } from './pii';

let currentRequestId: string | null = null;

/**
 * Set request ID for current execution context
 * Should be called by middleware or at route entry point
 */
export function setRequestId(id: string) {
  currentRequestId = id;
}

/**
 * Get current request ID
 */
export function getRequestId(): string | undefined {
  return currentRequestId ?? undefined;
}

/**
 * Clear request ID (useful for cleanup in serverless)
 */
export function clearRequestId() {
  currentRequestId = null;
}

/**
 * Main logging function - outputs structured JSON to stdout
 */
export function log(entry: LogEntry) {
  const isProd = process.env.NODE_ENV === 'production';
  const isDev = process.env.NODE_ENV === 'development';

  // In production, suppress debug logs unless explicitly enabled
  if (isProd && entry.lvl === 'debug' && !isDebugEnabled(entry.userId, entry.email)) {
    return;
  }

  // Build structured log entry
  const payload: LogEntry = {
    lvl: entry.lvl,
    msg: entry.msg,
    ts: entry.ts ?? new Date().toISOString(),
    requestId: entry.requestId ?? currentRequestId ?? undefined,
  };

  // Add optional fields
  if (entry.path) payload.path = entry.path;
  if (entry.userId) payload.userId = entry.userId;
  if (entry.email) payload.email = maskEmail(entry.email);
  if (entry.stripe) payload.stripe = entry.stripe;
  if (entry.err) payload.err = sanitizeError(entry.err);
  if (entry.meta) payload.meta = redactSensitiveData(entry.meta);

  // Output format based on environment
  if (isDev) {
    // Pretty print for development
    console.log(`[${payload.lvl.toUpperCase()}] ${payload.msg}`, {
      ...payload,
      msg: undefined,
      lvl: undefined,
    });
  } else {
    // Structured JSON for production (Vercel Logs)
    console.log(JSON.stringify(payload));
  }
}

/**
 * Check if debug logging is enabled for this user/email
 */
function isDebugEnabled(userId?: string, email?: string): boolean {
  // Check environment variable allowlist
  const debugUsers = process.env.DEBUG_USERS?.split(',').map(u => u.trim()) || [];

  if (userId && debugUsers.includes(userId)) return true;
  if (email && debugUsers.includes(email)) return true;

  // TODO: Add database-backed allowlist with TTL
  // This would query a `debug_allowlist` table with columns:
  // - user_id or email
  // - expires_at timestamp

  return false;
}

/**
 * Sanitize error object for safe logging
 */
function sanitizeError(err: ErrorContext | Error): ErrorContext {
  if (err instanceof Error) {
    return {
      type: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    };
  }

  return {
    type: err.type,
    code: err.code,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };
}

/**
 * Convenience functions for common log levels
 */
export const logger = {
  info: (msg: string, ctx?: Omit<LogEntry, 'lvl' | 'msg'>) => log({ lvl: 'info', msg, ...ctx }),
  warn: (msg: string, ctx?: Omit<LogEntry, 'lvl' | 'msg'>) => log({ lvl: 'warn', msg, ...ctx }),
  error: (msg: string, ctx?: Omit<LogEntry, 'lvl' | 'msg'>) => log({ lvl: 'error', msg, ...ctx }),
  debug: (msg: string, ctx?: Omit<LogEntry, 'lvl' | 'msg'>) => log({ lvl: 'debug', msg, ...ctx }),
};
