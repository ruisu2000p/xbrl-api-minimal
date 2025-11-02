/**
 * Structured Logging Types for Vercel Logs Integration
 *
 * Provides type-safe, production-ready logging with:
 * - PII masking
 * - Request correlation
 * - Stripe event tracking
 * - Error context
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type StripeLogContext = {
  eventId?: string;
  customerId?: string;
  subscriptionId?: string;
  action?: 'checkout' | 'upgrade' | 'downgrade' | 'cancel' | 'delete' | 'webhook';
  outcome?: 'success' | 'skip' | 'error';
};

export type ErrorContext = {
  type?: string;
  code?: string;
  message?: string;
  stack?: string;
};

export type LogEntry = {
  lvl: LogLevel;
  msg: string;
  ts?: string;
  path?: string;
  userId?: string;
  email?: string;
  requestId?: string;
  stripe?: StripeLogContext;
  err?: ErrorContext;
  meta?: Record<string, unknown>;
};
