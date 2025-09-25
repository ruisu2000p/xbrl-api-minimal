/**
 * CSRF Protection Library
 * Implements double-submit cookie pattern and origin validation
 */

import { headers } from 'next/headers'
import crypto from 'crypto'
import { NextRequest } from 'next/server'

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Validate CSRF token using double-submit cookie pattern
 */
export async function validateCSRFToken(
  request: NextRequest | Request,
  token?: string
): Promise<boolean> {
  try {
    const headersList = headers()

    // 1. Check Origin/Referer headers
    const origin = headersList.get('origin')
    const referer = headersList.get('referer')
    const host = headersList.get('host')

    if (!origin && !referer) {
      console.error('[CSRF] No origin or referer header')
      return false
    }

    // Validate origin matches expected host
    const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL || `https://${host}`
    if (origin && !origin.startsWith(expectedOrigin)) {
      console.error(`[CSRF] Origin mismatch: ${origin} != ${expectedOrigin}`)
      return false
    }

    // 2. Check for CSRF token in headers or body
    const csrfHeader = headersList.get('x-csrf-token')
    if (!csrfHeader && !token) {
      console.error('[CSRF] No CSRF token provided')
      return false
    }

    // 3. Validate token format (should be base64url)
    const tokenToValidate = csrfHeader || token || ''
    if (!/^[A-Za-z0-9_-]+$/.test(tokenToValidate)) {
      console.error('[CSRF] Invalid token format')
      return false
    }

    return true
  } catch (error) {
    console.error('[CSRF] Validation error:', error)
    return false
  }
}

/**
 * Validate request method for Server Actions
 */
export function validateRequestMethod(
  method: string,
  allowedMethods: string[] = ['POST']
): boolean {
  return allowedMethods.includes(method.toUpperCase())
}

/**
 * Rate limiting for Server Actions
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(identifier)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }

  if (userLimit.count >= maxRequests) {
    return false
  }

  userLimit.count++
  return true
}

/**
 * Clean expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 300000) // Clean every 5 minutes