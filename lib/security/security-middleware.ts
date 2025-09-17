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

export interface SecurityContext {
  userId: string;
  apiKeyId: string;
  migrationNeeded?: boolean;
}

interface SecurityApplyResult {
  response?: NextResponse;
  request: NextRequest;
  context?: SecurityContext;
  rateLimitHeaders?: Record<string, string>;
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
  ): Promise<SecurityApplyResult> {
    try {
      let modifiedRequest = request;
      let context: SecurityContext | undefined;
      let rateLimitHeaders: Record<string, string> | undefined;

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
          return { response: ipLimitResponse, request };
        }
      }

      // 2. Authentication check
      if (config.requireAuth) {
        const apiKey = this.extractApiKey(request);

        if (!apiKey) {
          return {
            response: NextResponse.json(
              { error: 'API key required' },
              { status: 401 }
            ),
            request
          };
        }

        // Authenticate with unified auth manager
        const authResult = await UnifiedAuthManager.authenticateApiKey(apiKey);

        if (!authResult.success) {
          logger.warn('Authentication failed', { error: authResult.error });
          return {
            response: NextResponse.json(
              { error: authResult.error || 'Authentication failed' },
              { status: 401 }
            ),
            request
          };
        }

        // Store auth context in headers for downstream use
        const headers = new Headers(request.headers);
        headers.set('x-user-id', authResult.userId!);
        headers.set('x-api-key-id', authResult.apiKeyId!);

        context = {
          userId: authResult.userId!,
          apiKeyId: authResult.apiKeyId!,
          migrationNeeded: authResult.migrationNeeded
        };

        if (authResult.migrationNeeded) {
          headers.set('x-security-warning', 'api-key-migration-needed');
          logger.info('Legacy API key detected, migration initiated', {
            apiKeyId: authResult.apiKeyId
          });
        }

        modifiedRequest = await this.cloneRequestWithHeaders(request, headers);

        // 3. User-based rate limiting
        if (config.rateLimit?.enabled !== false) {
          // Get user's plan from database
          const planType = await this.getUserPlan(authResult.userId!);

          const rateLimitResult = await checkRateLimit(
            request,
            authResult.apiKeyId!,
            planType
          );

          if (rateLimitResult.blocked && rateLimitResult.response) {
            logger.warn('User rate limit exceeded', {
              userId: authResult.userId,
              apiKeyId: authResult.apiKeyId
            });
            return {
              response: rateLimitResult.response,
              request: modifiedRequest,
              context,
              rateLimitHeaders: rateLimitResult.headers
            };
          }

          rateLimitHeaders = rateLimitResult.headers;
        }
      }

      return {
        request: modifiedRequest,
        context,
        rateLimitHeaders
      };
    } catch (error) {
      logger.error('Security middleware error', error);
      return {
        response: NextResponse.json(
          { error: 'Internal security error' },
          { status: 500 }
        ),
        request
      };
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
    handler: (req: NextRequest, context?: SecurityContext) => Promise<NextResponse>,
    config: SecurityConfig = { requireAuth: true }
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const result = await this.apply(request, config);

      if (result.response) {
        if (result.rateLimitHeaders) {
          Object.entries(result.rateLimitHeaders).forEach(([key, value]) => {
            result.response!.headers.set(key, value);
          });
        }

        if (result.context?.migrationNeeded) {
          result.response.headers.set('x-security-warning', 'api-key-migration-needed');
        }

        if (result.context?.userId) {
          result.response.headers.set('x-user-id', result.context.userId);
        }

        if (result.context?.apiKeyId) {
          result.response.headers.set('x-api-key-id', result.context.apiKeyId);
        }

        return result.response;
      }

      const handlerResponse = await handler(result.request, result.context);

      if (result.rateLimitHeaders) {
        Object.entries(result.rateLimitHeaders).forEach(([key, value]) => {
          handlerResponse.headers.set(key, value);
        });
      }

      if (result.context?.migrationNeeded) {
        handlerResponse.headers.set('x-security-warning', 'api-key-migration-needed');
      }

      if (result.context?.userId) {
        handlerResponse.headers.set('x-user-id', result.context.userId);
      }

      if (result.context?.apiKeyId) {
        handlerResponse.headers.set('x-api-key-id', result.context.apiKeyId);
      }

      return handlerResponse;
    };
  }

  private static async cloneRequestWithHeaders(
    request: NextRequest,
    headers: Headers
  ): Promise<NextRequest> {
    if (request.method === 'GET' || request.method === 'HEAD') {
      return new NextRequest(request.url, {
        method: request.method,
        headers
      });
    }

    const body = await request.clone().arrayBuffer();

    return new NextRequest(request.url, {
      method: request.method,
      headers,
      body
    });
  }
}