import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Security headers
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co",
}

// Rate limiting map for simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(identifier)

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }

  if (limit.count >= maxRequests) {
    return false
  }

  limit.count++
  return true
}

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 60000) // Clean every minute

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CVE-2025-29927 Protection - Block x-middleware-subrequest header
  if (
    request.headers.get('x-middleware-subrequest') ||
    request.headers.get('x-middleware-prefetch') ||
    request.headers.get('x-nextjs-internal')
  ) {
    console.error('[Security] Blocked potential CVE-2025-29927 attack attempt')
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Apply security headers to all responses
  const response = NextResponse.next()
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // API route protection
  if (pathname.startsWith('/api/')) {
    // Prevent path traversal
    if (pathname.includes('..') || pathname.includes('//')) {
      return new NextResponse('Invalid path', { status: 400 })
    }

    // Check for suspicious patterns
    if (/[<>"|?*\0]/.test(pathname)) {
      return new NextResponse('Invalid characters in path', { status: 400 })
    }

    // Rate limiting for API routes
    const clientIp = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown'

    // Different rate limits for different endpoints
    let maxRequests = 100 // Default
    let windowMs = 60000 // 1 minute

    if (pathname.startsWith('/api/auth/')) {
      maxRequests = 10
      windowMs = 300000 // 5 minutes for auth endpoints
    } else if (pathname.startsWith('/api/v1/documents')) {
      maxRequests = 50
      windowMs = 60000 // 1 minute for document API
    }

    if (!checkRateLimit(`api:${clientIp}:${pathname}`, maxRequests, windowMs)) {
      return new NextResponse('Rate limit exceeded', { status: 429 })
    }

    // Validate API key format if present
    const apiKey = request.headers.get('x-api-key')
    if (apiKey) {
      // Check for valid API key format (xbrl_live_v1_UUID_SECRET)
      const apiKeyPattern = /^xbrl_(live|test)_v\d+_[a-f0-9-]+_[A-Za-z0-9_-]+$/
      if (!apiKeyPattern.test(apiKey)) {
        return new NextResponse('Invalid API key format', { status: 401 })
      }
    }

    // CORS headers for API routes
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    // Add CORS headers to response
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  }

  // XSS Protection for query parameters
  const url = request.nextUrl
  const params = url.searchParams

  for (const [key, value] of params.entries()) {
    // Check for XSS patterns
    if (/<script|javascript:|on\w+=/i.test(value)) {
      return new NextResponse('Invalid query parameters', { status: 400 })
    }

    // Check for SQL injection patterns
    if (/(\bor\b|\band\b|union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|eval|setTimeout|setInterval)/i.test(value)) {
      // Log potential attack for monitoring
      console.warn(`[Security] Potential SQL injection attempt: ${key}=${value}`)
      return new NextResponse('Invalid query parameters', { status: 400 })
    }
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const session = request.cookies.get('supabase-auth-token')
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const session = request.cookies.get('supabase-auth-token')
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}