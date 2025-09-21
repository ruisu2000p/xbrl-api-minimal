/**
 * Production-ready logger utility
 * Replaces console.log/error with environment-aware logging
 */

/* eslint-disable no-console */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args)
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args)
    }
  },

  error: (...args: any[]) => {
    // Always log errors, but format differently in production
    if (isDevelopment) {
      console.error('[ERROR]', ...args)
    } else {
      // In production, could send to monitoring service
      console.error(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        message: args[0],
        details: args.slice(1)
      }))
    }
  },

  debug: (...args: any[]) => {
    // Only in development
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args)
    }
  }
}