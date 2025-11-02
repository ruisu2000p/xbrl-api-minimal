/**
 * Client-side Safe Logger
 *
 * Usage:
 *   import { logger } from '@/utils/logger/client';
 *
 *   logger.info('User clicked button', { buttonId: 'submit' });
 *   logger.debug('Component rendered', { props }); // Only in dev or when debug enabled
 *
 * Features:
 * - Debug toggle via ?debug=1, localStorage.DEBUG=1, or cookie
 * - PII masking enforcement
 * - Production-safe (debug logs suppressed by default)
 */

import { maskEmail, redactSensitiveData } from './pii';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Check if client-side debug mode is enabled
 */
function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  // Check URL parameter: ?debug=1
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('debug') === '1') return true;

  // Check localStorage: localStorage.setItem('DEBUG', '1')
  try {
    if (localStorage.getItem('DEBUG') === '1') return true;
  } catch (e) {
    // localStorage may be disabled
  }

  // Check cookie: DEBUG=1
  if (document.cookie.split('; ').some(c => c === 'DEBUG=1')) return true;

  return false;
}

/**
 * Safe client-side logger
 */
class ClientLogger {
  private isProd = process.env.NODE_ENV === 'production';

  private shouldLog(level: LogLevel): boolean {
    if (!this.isProd) return true; // Always log in development
    if (level === 'debug') return isDebugEnabled(); // Debug only when enabled
    return true; // Info, warn, error always log
  }

  private formatMessage(level: LogLevel, msg: string, meta?: Record<string, any>) {
    const timestamp = new Date().toISOString();

    if (!this.isProd) {
      // Pretty print for development
      return [
        `[${level.toUpperCase()}] ${msg}`,
        meta ? redactSensitiveData(meta) : undefined,
      ].filter(Boolean);
    }

    // Structured format for production
    return [
      JSON.stringify({
        lvl: level,
        msg,
        ts: timestamp,
        meta: meta ? redactSensitiveData(meta) : undefined,
      }),
    ];
  }

  info(msg: string, meta?: Record<string, any>) {
    if (!this.shouldLog('info')) return;
    console.log(...this.formatMessage('info', msg, meta));
  }

  warn(msg: string, meta?: Record<string, any>) {
    if (!this.shouldLog('warn')) return;
    console.warn(...this.formatMessage('warn', msg, meta));
  }

  error(msg: string, meta?: Record<string, any>) {
    if (!this.shouldLog('error')) return;
    console.error(...this.formatMessage('error', msg, meta));
  }

  debug(msg: string, meta?: Record<string, any>) {
    if (!this.shouldLog('debug')) return;
    console.log(...this.formatMessage('debug', msg, meta));
  }
}

export const logger = new ClientLogger();
