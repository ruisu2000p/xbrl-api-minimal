/**
 * CSRF Protection Library
 * Implements double-submit cookie pattern and origin validation
 * with server-side token storage for verification
 */

import { headers } from 'next/headers'
import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'

/**
 * Generate CSRF token and store it server-side
 */
export async function generateCSRFToken(sessionId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url')
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  try {
    const supabase = supabaseManager.getServiceClient()
    if (!supabase) {
      throw new Error('Service client not available for CSRF protection');
    }
    await supabase
      .from('csrf_tokens')
      .upsert({
        session_id: sessionId,
        token_hash: hashedToken,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      }, {
        onConflict: 'session_id'
      })
  } catch (error) {
    console.error('[CSRF] Failed to store token:', error)
  }

  return token
}

/**
 * Validate CSRF token using double-submit cookie pattern with server-side verification
 */
export async function validateCSRFToken(
  request: NextRequest | Request,
  sessionId: string,
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
    const csrfCookie = request.headers?.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('csrf-token='))
      ?.split('=')[1]

    const tokenToValidate = csrfHeader || token || csrfCookie || ''

    if (!tokenToValidate) {
      console.error('[CSRF] No CSRF token provided')
      return false
    }

    // 3. Validate token format (should be base64url)
    if (!/^[A-Za-z0-9_-]+$/.test(tokenToValidate)) {
      console.error('[CSRF] Invalid token format')
      return false
    }

    // 4. Verify token against stored hash in database
    const hashedToken = crypto.createHash('sha256').update(tokenToValidate).digest('hex')
    const supabase = supabaseManager.getServiceClient()
    if (!supabase) {
      throw new Error('Service client not available for CSRF protection');
    }

    const { data: storedToken, error } = await supabase
      .from('csrf_tokens')
      .select('token_hash, expires_at')
      .eq('session_id', sessionId)
      .eq('token_hash', hashedToken)
      .single()

    if (error || !storedToken) {
      console.error('[CSRF] Token not found or expired')
      return false
    }

    // 5. Check token expiration
    if (new Date(storedToken.expires_at) < new Date()) {
      console.error('[CSRF] Token expired')
      // Clean up expired token
      await supabase
        .from('csrf_tokens')
        .delete()
        .eq('session_id', sessionId)
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
 * Rate limiting using Supabase for distributed environments
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): Promise<boolean> {
  try {
    const supabase = supabaseManager.getServiceClient()
    if (!supabase) {
      throw new Error('Service client not available for CSRF protection');
    }
    const now = Date.now()
    const windowStart = new Date(now - windowMs).toISOString()

    // Count recent requests
    const { count, error: countError } = await supabase
      .from('rate_limit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .gte('created_at', windowStart)

    if (countError) {
      console.error('[Rate Limit] Count error:', countError)
      // Fail open in case of error (allow request)
      return true
    }

    if ((count || 0) >= maxRequests) {
      return false
    }

    // Log the request
    await supabase
      .from('rate_limit_logs')
      .insert({
        identifier,
        created_at: new Date().toISOString()
      })

    return true
  } catch (error) {
    console.error('[Rate Limit] Error:', error)
    // Fail open in case of error
    return true
  }
}

/**
 * Clean expired tokens and rate limit logs periodically
 * This should be run as a scheduled job in production
 */
export async function cleanupExpiredData(): Promise<void> {
  try {
    const supabase = supabaseManager.getServiceClient()
    if (!supabase) {
      throw new Error('Service client not available for CSRF protection');
    }
    const now = new Date().toISOString()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    // Clean expired CSRF tokens
    await supabase
      .from('csrf_tokens')
      .delete()
      .lt('expires_at', now)

    // Clean old rate limit logs
    await supabase
      .from('rate_limit_logs')
      .delete()
      .lt('created_at', oneHourAgo)

    console.log('[Cleanup] Expired data cleaned')
  } catch (error) {
    console.error('[Cleanup] Error:', error)
  }
}