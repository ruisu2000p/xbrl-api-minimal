import { NextRequest, NextResponse } from 'next/server';
import { UnifiedAuthManager } from './auth-manager';
import { checkRateLimit, checkIpRateLimit } from '../middleware/rate-limit';
import { logger } from '../utils/logger';

export interface SecurityConfig {
  requireAuth: boolean;
  allowedRoles?: string[];
  rateLimit?: {
    enabled: boolean;
    maxRequests?: number;
    windowMs?: number;
  };
  ipRateLimit?: {
    enabled: boolean;
    maxRequests?: number;
    windowMs?: number;
  };
}

/**
 * Unified Security Middleware
 * Centralized security checks for all API endpoints
 */
export class SecurityMiddleware {
  /**
   * Apply security checks to incoming request
   */
  static async apply(
    request: NextRequest,
    config: SecurityConfig = { requireAuth: true }
  ): Promise<NextResponse | null> {
    try {
      // 1. IP-based rate limiting (for non-authenticated endpoints)
      if (config.ipRateLimit?.enabled) {
        const ipLimitResponse = await checkIpRateLimit(
          request,
          config.ipRateLimit.maxRequests,
          config.ipRateLimit.windowMs
        );
        if (ipLimitResponse) {
          logger.warn('IP rate limit exceeded', {
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          });
          return ipLimitResponse;
        }
      }

      // 2. Authentication check
      if (config.requireAuth) {
        const apiKey = this.extractApiKey(request);

        if (!apiKey) {
          return NextResponse.json(
            { error: 'API key required' },
            { status: 401 }
          );
        }

        // Authenticate with unified auth manager
        const authResult = await UnifiedAuthManager.authenticateApiKey(apiKey);

        if (!authResult.success) {
          logger.warn('Authentication failed', { error: authResult.error });
          return NextResponse.json(
            { error: authResult.error || 'Authentication failed' },
            { status: 401 }
          );
        }

        // Store auth context in headers for downstream use
        const headers = new Headers(request.headers);
        headers.set('x-user-id', authResult.userId!);
        headers.set('x-api-key-id', authResult.apiKeyId!);

        // Add migration warning header if needed
        if (authResult.migrationNeeded) {
          headers.set('x-security-warning', 'api-key-migration-needed');
          logger.info('Legacy API key detected, migration initiated', {
            apiKeyId: authResult.apiKeyId
          });
        }

        // 3. User-based rate limiting
        if (config.rateLimit?.enabled !== false) {
          // Get user's plan from database
          const planType = await this.getUserPlan(authResult.userId!);

          const rateLimitResponse = await checkRateLimit(
            request,
            authResult.apiKeyId!,
            planType
          );

          if (rateLimitResponse) {
            logger.warn('User rate limit exceeded', {
              userId: authResult.userId,
              apiKeyId: authResult.apiKeyId
            });
            return rateLimitResponse;
          }
        }

        // Create new request with updated headers
        const modifiedRequest = new NextRequest(request.url, {
          headers,
          method: request.method,
          body: request.body
        });

        // Continue to next handler
        return null;
      }

      return null;
    } catch (error) {
      logger.error('Security middleware error', error);
      return NextResponse.json(
        { error: 'Internal security error' },
        { status: 500 }
      );
    }
  }

  /**
   * Extract API key from request
   */
  private static extractApiKey(request: NextRequest): string | null {
    // 1. Check Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. Check X-API-Key header
    const apiKeyHeader = request.headers.get('x-api-key');
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // 3. Check URL query parameter (less secure, discouraged)
    const url = new URL(request.url);
    const queryApiKey = url.searchParams.get('api_key');
    if (queryApiKey) {
      logger.warn('API key passed in URL query parameter (insecure)');
      return queryApiKey;
    }

    return null;
  }

  /**
   * Get user's subscription plan
   */
  private static async getUserPlan(userId: string): Promise<string> {
    // This would query the database for user's plan
    // For now, return default
    return 'free';
  }

  /**
   * Create middleware wrapper for easy integration
   */
  static withSecurity(
    handler: (req: NextRequest) => Promise<NextResponse>,
    config: SecurityConfig = { requireAuth: true }
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      // Apply security checks
      const securityResponse = await this.apply(request, config);

      // If security check failed, return error response
      if (securityResponse) {
        return securityResponse;
      }

      // Otherwise, proceed with the handler
      return handler(request);
    };
  }
}