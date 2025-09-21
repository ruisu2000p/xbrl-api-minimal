/**
 * Authentication module for XBRL MCP Server
 * Handles API key validation and user authentication
 */

import crypto from 'crypto';

export class AuthManager {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Generate a new API key
   * @param {string} userId - User ID
   * @param {string} name - Key name
   * @param {string} tier - Subscription tier (free, basic, premium)
   * @returns {object} API key details
   */
  async generateApiKey(userId, name, tier = 'free') {
    // Generate random key
    const keyBytes = crypto.randomBytes(32);
    const apiKey = `xbrl_v1_${keyBytes.toString('hex')}`;

    // Create hash for storage
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Store in database
    const { data, error } = await this.supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name,
        key_hash: keyHash,
        status: 'active',
        created_at: new Date().toISOString(),
        last_used_at: null,
        expires_at: this.calculateExpiry(tier)
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    // Set rate limits based on tier
    await this.setRateLimits(data.id, tier);

    return {
      id: data.id,
      api_key: apiKey,
      name,
      tier,
      expires_at: data.expires_at
    };
  }

  /**
   * Validate API key and return user context
   * @param {string} apiKey - API key to validate
   * @returns {object} Validation result with user context
   */
  async validateApiKey(apiKey) {
    try {
      // Check format
      if (!apiKey || !apiKey.startsWith('xbrl_v1_')) {
        return {
          valid: false,
          error: 'Invalid API key format'
        };
      }

      // Hash the key
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      // Validate using Supabase function
      const { data, error } = await this.supabase
        .rpc('validate_api_key_access', { key_hash: keyHash });

      if (error || !data || data.length === 0) {
        return {
          valid: false,
          error: 'Invalid or expired API key'
        };
      }

      const keyInfo = data[0];

      // Check expiration
      if (keyInfo.expires_at && new Date(keyInfo.expires_at) < new Date()) {
        return {
          valid: false,
          error: 'API key has expired'
        };
      }

      // Update last used timestamp
      await this.updateLastUsed(keyInfo.id);

      // Log usage
      await this.logUsage(keyInfo.id, 'api_key_validated');

      return {
        valid: true,
        user_id: keyInfo.user_id,
        key_id: keyInfo.id,
        tier: keyInfo.tier || 'free',
        name: keyInfo.name
      };
    } catch (error) {
      console.error('API key validation error:', error);
      return {
        valid: false,
        error: 'Validation failed'
      };
    }
  }

  /**
   * Check rate limits for API key
   * @param {string} keyId - API key ID
   * @returns {object} Rate limit status
   */
  async checkRateLimit(keyId) {
    // Get rate limits
    const { data: limits, error: limitError } = await this.supabase
      .from('api_key_rate_limits')
      .select('*')
      .eq('api_key_id', keyId)
      .single();

    if (limitError || !limits) {
      // Default limits if not found
      return {
        allowed: true,
        limit: 100,
        remaining: 100,
        reset: Date.now() + 60000
      };
    }

    // Get recent usage count
    const windowStart = new Date(Date.now() - 60000).toISOString(); // 1 minute window
    const { count, error: countError } = await this.supabase
      .from('api_key_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('api_key_id', keyId)
      .gte('created_at', windowStart);

    const used = count || 0;
    const remaining = Math.max(0, limits.requests_per_minute - used);

    return {
      allowed: remaining > 0,
      limit: limits.requests_per_minute,
      remaining,
      reset: Date.now() + 60000,
      tier: limits.tier
    };
  }

  /**
   * Set rate limits based on tier
   * @param {string} keyId - API key ID
   * @param {string} tier - Subscription tier
   */
  async setRateLimits(keyId, tier) {
    const limits = {
      free: { requests_per_minute: 100, requests_per_day: 1000 },
      basic: { requests_per_minute: 1000, requests_per_day: 50000 },
      premium: { requests_per_minute: 10000, requests_per_day: 1000000 }
    };

    const tierLimits = limits[tier] || limits.free;

    await this.supabase
      .from('api_key_rate_limits')
      .upsert({
        api_key_id: keyId,
        requests_per_minute: tierLimits.requests_per_minute,
        requests_per_day: tierLimits.requests_per_day,
        tier,
        updated_at: new Date().toISOString()
      });
  }

  /**
   * Log API usage
   * @param {string} keyId - API key ID
   * @param {string} endpoint - Endpoint accessed
   * @param {object} metadata - Additional metadata
   */
  async logUsage(keyId, endpoint, metadata = {}) {
    try {
      await this.supabase
        .from('api_key_usage_logs')
        .insert({
          api_key_id: keyId,
          endpoint,
          request_metadata: metadata,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log usage:', error);
    }
  }

  /**
   * Update last used timestamp
   * @param {string} keyId - API key ID
   */
  async updateLastUsed(keyId) {
    try {
      await this.supabase
        .from('api_keys')
        .update({
          last_used_at: new Date().toISOString()
        })
        .eq('id', keyId);
    } catch (error) {
      console.error('Failed to update last used:', error);
    }
  }

  /**
   * Calculate expiry date based on tier
   * @param {string} tier - Subscription tier
   * @returns {string} Expiry date ISO string
   */
  calculateExpiry(tier) {
    const now = new Date();
    switch (tier) {
      case 'free':
        // 30 days for free tier
        now.setDate(now.getDate() + 30);
        break;
      case 'basic':
        // 90 days for basic tier
        now.setDate(now.getDate() + 90);
        break;
      case 'premium':
        // 1 year for premium tier
        now.setFullYear(now.getFullYear() + 1);
        break;
      default:
        // Default to 30 days
        now.setDate(now.getDate() + 30);
    }
    return now.toISOString();
  }

  /**
   * Revoke an API key
   * @param {string} keyId - API key ID
   */
  async revokeApiKey(keyId) {
    const { error } = await this.supabase
      .from('api_keys')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId);

    if (error) {
      throw new Error(`Failed to revoke API key: ${error.message}`);
    }

    // Log security event
    await this.logSecurityEvent(keyId, 'api_key_revoked');
  }

  /**
   * Log security event
   * @param {string} keyId - API key ID
   * @param {string} eventType - Type of security event
   * @param {object} details - Event details
   */
  async logSecurityEvent(keyId, eventType, details = {}) {
    try {
      await this.supabase
        .from('security_events')
        .insert({
          api_key_id: keyId,
          event_type: eventType,
          details,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Authenticate user with email/password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {object} Authentication result
   */
  async authenticateUser(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (error) {
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Create new user account
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {object} profile - User profile data
   * @returns {object} Registration result
   */
  async createUser(email, password, profile = {}) {
    try {
      // Sign up user
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password
      });

      if (authError) {
        return {
          success: false,
          error: authError.message
        };
      }

      // Create profile
      if (authData.user) {
        const { error: profileError } = await this.supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email,
            ...profile,
            created_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        // Generate initial API key
        const apiKey = await this.generateApiKey(
          authData.user.id,
          'Default Key',
          'free'
        );

        return {
          success: true,
          user: authData.user,
          api_key: apiKey.api_key
        };
      }

      return {
        success: false,
        error: 'User creation failed'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Registration failed'
      };
    }
  }
}

export default AuthManager;