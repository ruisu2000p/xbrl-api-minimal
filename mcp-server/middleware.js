/**
 * Middleware for XBRL MCP Server
 * Handles rate limiting, error handling, and request validation
 */

import { AuthManager } from './auth.js';

export class Middleware {
  constructor(supabase) {
    this.supabase = supabase;
    this.authManager = new AuthManager(supabase);
    this.requestCache = new Map();
  }

  /**
   * Rate limiting middleware
   * @param {object} context - Request context
   * @returns {object} Rate limit result
   */
  async rateLimit(context) {
    const { api_key, key_id } = context;

    if (!key_id) {
      return {
        allowed: false,
        error: 'API key required for rate limiting'
      };
    }

    // Check rate limits
    const rateLimitStatus = await this.authManager.checkRateLimit(key_id);

    if (!rateLimitStatus.allowed) {
      // Log rate limit violation
      await this.authManager.logSecurityEvent(
        key_id,
        'rate_limit_exceeded',
        {
          limit: rateLimitStatus.limit,
          tier: rateLimitStatus.tier
        }
      );

      return {
        allowed: false,
        error: 'Rate limit exceeded',
        retry_after: rateLimitStatus.reset,
        headers: {
          'X-RateLimit-Limit': rateLimitStatus.limit,
          'X-RateLimit-Remaining': rateLimitStatus.remaining,
          'X-RateLimit-Reset': new Date(rateLimitStatus.reset).toISOString()
        }
      };
    }

    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': rateLimitStatus.limit,
        'X-RateLimit-Remaining': rateLimitStatus.remaining,
        'X-RateLimit-Reset': new Date(rateLimitStatus.reset).toISOString()
      }
    };
  }

  /**
   * Validate request parameters
   * @param {string} tool - Tool name
   * @param {object} params - Request parameters
   * @returns {object} Validation result
   */
  validateRequest(tool, params) {
    const validations = {
      'search-documents': {
        required: ['company'],
        optional: ['fiscal_year', 'document_type', 'limit', 'offset'],
        types: {
          company: 'string',
          fiscal_year: 'string',
          document_type: 'string',
          limit: 'number',
          offset: 'number'
        }
      },
      'get-document': {
        required: ['path'],
        optional: ['max_size'],
        types: {
          path: 'string',
          max_size: 'number'
        }
      },
      'list-companies': {
        required: [],
        optional: ['fiscal_year', 'limit', 'offset'],
        types: {
          fiscal_year: 'string',
          limit: 'number',
          offset: 'number'
        }
      },
      'get-company-info': {
        required: ['company_id'],
        optional: [],
        types: {
          company_id: 'string'
        }
      }
    };

    const rules = validations[tool];
    if (!rules) {
      return {
        valid: false,
        error: `Unknown tool: ${tool}`
      };
    }

    // Check required parameters
    for (const field of rules.required) {
      if (!params[field]) {
        return {
          valid: false,
          error: `Missing required parameter: ${field}`
        };
      }
    }

    // Check parameter types
    for (const [field, value] of Object.entries(params)) {
      if (rules.types[field]) {
        const expectedType = rules.types[field];
        const actualType = typeof value;

        if (actualType !== expectedType) {
          return {
            valid: false,
            error: `Invalid type for ${field}: expected ${expectedType}, got ${actualType}`
          };
        }
      }
    }

    // Validate specific constraints
    if (params.limit && (params.limit < 1 || params.limit > 1000)) {
      return {
        valid: false,
        error: 'Limit must be between 1 and 1000'
      };
    }

    if (params.offset && params.offset < 0) {
      return {
        valid: false,
        error: 'Offset must be non-negative'
      };
    }

    if (params.fiscal_year && !['FY2022', 'FY2023', 'FY2024', 'FY2025'].includes(params.fiscal_year)) {
      return {
        valid: false,
        error: 'Invalid fiscal year. Must be FY2022-FY2025'
      };
    }

    return { valid: true };
  }

  /**
   * Error handler
   * @param {Error} error - Error object
   * @param {object} context - Request context
   * @returns {object} Error response
   */
  async handleError(error, context = {}) {
    const { tool, key_id } = context;

    // Log error
    console.error(`Error in ${tool}:`, error);

    // Log to database if we have a key_id
    if (key_id) {
      try {
        await this.supabase
          .from('api_key_usage_logs')
          .insert({
            api_key_id: key_id,
            endpoint: tool,
            request_metadata: {
              error: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString()
            }
          });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }

    // Categorize errors
    const errorCategories = {
      'Invalid API key': { code: 401, type: 'authentication_error' },
      'Rate limit exceeded': { code: 429, type: 'rate_limit_error' },
      'Document not found': { code: 404, type: 'not_found' },
      'requires a premium subscription': { code: 403, type: 'subscription_required' },
      'Missing required parameter': { code: 400, type: 'validation_error' },
      'Invalid type for': { code: 400, type: 'validation_error' },
      'Database error': { code: 500, type: 'database_error' },
      'Storage error': { code: 500, type: 'storage_error' }
    };

    // Find matching category
    let errorInfo = { code: 500, type: 'internal_error' };
    for (const [pattern, info] of Object.entries(errorCategories)) {
      if (error.message.includes(pattern)) {
        errorInfo = info;
        break;
      }
    }

    return {
      error: {
        type: errorInfo.type,
        code: errorInfo.code,
        message: error.message,
        tool,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Request caching middleware
   * @param {string} key - Cache key
   * @param {function} fn - Function to cache
   * @param {number} ttl - Time to live in milliseconds
   * @returns {any} Cached or fresh result
   */
  async cache(key, fn, ttl = 60000) {
    // Check cache
    const cached = this.requestCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    // Execute function
    const value = await fn();

    // Store in cache
    this.requestCache.set(key, {
      value,
      expires: Date.now() + ttl
    });

    // Clean old cache entries
    this.cleanCache();

    return value;
  }

  /**
   * Clean expired cache entries
   */
  cleanCache() {
    const now = Date.now();
    for (const [key, entry] of this.requestCache.entries()) {
      if (entry.expires < now) {
        this.requestCache.delete(key);
      }
    }
  }

  /**
   * Sanitize user input
   * @param {string} input - User input
   * @returns {string} Sanitized input
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove SQL injection attempts
    const sqlPatterns = [
      /(\b)(DELETE|DROP|EXEC(UTE)?|INSERT|SELECT|UNION|UPDATE)(\b)/gi,
      /--/g,
      /\/\*/g,
      /\*\//g,
      /;/g
    ];

    let sanitized = input;
    for (const pattern of sqlPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Limit length
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000);
    }

    return sanitized.trim();
  }

  /**
   * Log request metrics
   * @param {object} context - Request context
   * @param {number} duration - Request duration in ms
   */
  async logMetrics(context, duration) {
    const { tool, key_id, params } = context;

    try {
      await this.supabase
        .from('api_key_usage_logs')
        .insert({
          api_key_id: key_id,
          endpoint: tool,
          request_metadata: {
            params: params,
            duration_ms: duration,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('Failed to log metrics:', error);
    }
  }

  /**
   * Check for suspicious activity
   * @param {object} context - Request context
   * @returns {boolean} True if suspicious
   */
  async checkSuspiciousActivity(context) {
    const { key_id, tool, params } = context;

    // Check for patterns
    const suspiciousPatterns = [
      // Excessive requests to same endpoint
      async () => {
        const tenMinutesAgo = new Date(Date.now() - 600000).toISOString();
        const { count } = await this.supabase
          .from('api_key_usage_logs')
          .select('id', { count: 'exact', head: true })
          .eq('api_key_id', key_id)
          .eq('endpoint', tool)
          .gte('created_at', tenMinutesAgo);

        return count > 100;
      },

      // Scanning behavior
      async () => {
        if (tool === 'list-companies' && params.limit > 100) {
          return true;
        }
        return false;
      },

      // Invalid parameter combinations
      () => {
        if (tool === 'search-documents' && params.limit > 500) {
          return true;
        }
        return false;
      }
    ];

    for (const check of suspiciousPatterns) {
      if (await check()) {
        // Log security event
        await this.authManager.logSecurityEvent(
          key_id,
          'suspicious_activity',
          { tool, params }
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Apply all middleware
   * @param {object} context - Request context
   * @param {function} handler - Request handler
   * @returns {any} Handler result or error
   */
  async apply(context, handler) {
    const startTime = Date.now();

    try {
      // Validate API key
      const authResult = await this.authManager.validateApiKey(context.api_key);
      if (!authResult.valid) {
        throw new Error(authResult.error || 'Invalid API key');
      }

      // Add auth info to context
      context.user_id = authResult.user_id;
      context.key_id = authResult.key_id;
      context.tier = authResult.tier;

      // Check rate limits
      const rateLimitResult = await this.rateLimit(context);
      if (!rateLimitResult.allowed) {
        throw new Error(rateLimitResult.error);
      }

      // Validate request
      const validationResult = this.validateRequest(context.tool, context.params);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // Check for suspicious activity
      if (await this.checkSuspiciousActivity(context)) {
        throw new Error('Suspicious activity detected');
      }

      // Sanitize inputs
      for (const [key, value] of Object.entries(context.params)) {
        if (typeof value === 'string') {
          context.params[key] = this.sanitizeInput(value);
        }
      }

      // Execute handler
      const result = await handler(context);

      // Log metrics
      const duration = Date.now() - startTime;
      await this.logMetrics(context, duration);

      // Add headers to result
      if (rateLimitResult.headers) {
        result.headers = { ...result.headers, ...rateLimitResult.headers };
      }

      return result;
    } catch (error) {
      return this.handleError(error, context);
    }
  }
}

export default Middleware;