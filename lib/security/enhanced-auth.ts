/**
 * Enhanced API Key Validation with HMAC-SHA256
 * Implements timing-safe comparison and advanced security features
 */

import crypto from 'crypto'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'

interface ValidationResult {
  valid: boolean
  userId?: string
  tier?: 'free' | 'basic' | 'premium'
  rateLimit?: {
    remaining: number
    resetTime: number
  }
  error?: string
}

interface KeyMetadata {
  userId: string
  tier: string
  createdAt: Date
  lastUsedAt?: Date
  isActive: boolean
}

export class EnhancedApiKeyValidator {
  private readonly hmacSecret: string
    private rateLimitStore: Record<string, { count: number; resetTime: number }> = {};

   
  constructor() {
    if (process.env.NODE_ENV === 'production' && !process.env.API_KEY_SECRET) {
      throw new Error('API_KEY_SECRET must be set in production')
    }

    // Use environment variable or generate secure random secret
    this.hmacSecret = process.env.API_KEY_SECRET || crypto.randomBytes(32).toString('hex')
    
    if (!process.env.API_KEY_SECRET) {
      console.warn('[Security] API_KEY_SECRET not set; using generated secret for non-production environments')
    }
  }


        

  /**
    

   * Compute HMAC-SHA256 hash of API key
   */
  private async computeHMAC(apiKey: string): Promise<string> {
    const hmac = crypto.createHmac('sha256', this.hmacSecret)
    hmac.update(apiKey)
    return hmac.digest('hex')
  }

  /**
   * Timing-safe comparison to prevent timing attacks
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    const bufferA = Buffer.from(a)
    const bufferB = Buffer.from(b)

    return crypto.timingSafeEqual(bufferA, bufferB)
  }

  /**
   * Validate API key format (xbrl_live_v1_UUID_SECRET)
   */
  private validateKeyFormat(apiKey: string): boolean {
    const pattern = /^xbrl_(live|test)_v\d+_[a-f0-9-]+_[A-Za-z0-9_-]+$/
    return pattern.test(apiKey)
  }

  /**
   * Extract key components
   */
  private parseApiKey(apiKey: string): {
    environment: string
    version: string
    uuid: string
    secret: string
  } | null {
    const parts = apiKey.split('_')

    if (parts.length !== 5) {
      return null
    }

    return {
      environment: parts[1], // live or test
      version: parts[2],     // v1, v2, etc.
      uuid: parts[3],         // UUID
      secret: parts[4]        // Secret part
    }
  }

  /**
   * Get stored hash from database
   */
  private async getStoredHash(apiKeyId: string): Promise<string | null> {
    try {
      const supabase = supabaseManager.getServiceClient()

      const { data, error } = await supabase
        .from('api_keys')
        .select('key_hash')
        .eq('id', apiKeyId)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return null
      }

      return data.key_hash
    } catch (error) {
      console.error('[Security] Failed to get stored hash:', error)
      return null
    }
  }

  /**
   * Get key metadata from database
   */
  private async getKeyMetadata(apiKeyId: string): Promise<KeyMetadata | null> {
    try {
      const supabase = supabaseManager.getServiceClient()

      const { data, error } = await supabase
        .from('api_keys')
        .select('user_id, tier, created_at, last_used_at, is_active')
        .eq('id', apiKeyId)
        .single()

      if (error || !data) {
        return null
      }

      return {
        userId: data.user_id,
        tier: data.tier,
        createdAt: new Date(data.created_at),
        lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : undefined,
        isActive: data.is_active
      }
    } catch (error) {
      console.error('[Security] Failed to get key metadata:', error)
      return null
    }
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(apiKeyId: string): Promise<void> {
    try {
      const supabase = supabaseManager.getServiceClient()

      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', apiKeyId)
    } catch (error) {
      console.error('[Security] Failed to update last used:', error)
    }
  }

  /**
   * Check rate limits
   */
  private async checkRateLimit(apiKeyId: string, tier: string): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
  }> {
    // Implementation would use Redis or similar for production
    // This is a simplified version
    const limits = {
      free: { perMinute: 10, perHour: 100 },
      basic: { perMinute: 100, perHour: 2000 },
      premium: { perMinute: 1000, perHour: 20000 }
    }

    const limit = limits[tier as keyof typeof limits] || limits.free

    const now = Date.now();
    // Initialize record for this API key if it doesn't exist
    let record = this.rateLimitStore[apiKeyId];
    if (!record) {
      record = { count: 0, resetTime: now + 60_000 };
      this.rateLimitStore[apiKeyId] = record;
    }

    // Reset the counter if the reset time has passed
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + 60_000;
    }

    // Deny request if limit exceeded
    if (record.count >= limit.perMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime
      };
    }

    // Increment count and allow
    record.count++;
    return {
      allowed: true,
      remaining: limit.perMinute - record.count,
      resetTime: record.resetTime
    };
  }

  /**
   * Main validation method
   */
  async validateKey(apiKey: string): Promise<ValidationResult> {
    try {
      // Step 1: Validate format
      if (!this.validateKeyFormat(apiKey)) {
        return {
          valid: false,
          error: 'Invalid API key format'
        }
      }

      // Step 2: Parse key components
      const keyComponents = this.parseApiKey(apiKey)
      if (!keyComponents) {
        return {
          valid: false,
          error: 'Failed to parse API key'
        }
      }

      // Step 3: Block test keys in production
      if (process.env.NODE_ENV === 'production' && keyComponents.environment === 'test') {
        return {
          valid: false,
          error: 'Test keys are not allowed in production'
        }
      }

      // Step 4: Get stored hash and metadata
      const [storedHash, metadata] = await Promise.all([
        this.getStoredHash(keyComponents.uuid),
        this.getKeyMetadata(keyComponents.uuid)
      ])

      if (!storedHash || !metadata) {
        return {
          valid: false,
          error: 'API key not found or inactive'
        }
      }

      // Step 5: Compute hash of provided key
      const computedHash = await this.computeHMAC(apiKey)

      // Step 6: Timing-safe comparison
      const isValid = this.timingSafeCompare(computedHash, storedHash)

      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid API key'
        }
      }

      // Step 7: Check if key is active
      if (!metadata.isActive) {
        return {
          valid: false,
          error: 'API key is inactive'
        }
      }

      // Step 8: Check rate limits
      const rateLimit = await this.checkRateLimit(keyComponents.uuid, metadata.tier)

      if (!rateLimit.allowed) {
        return {
          valid: false,
          error: 'Rate limit exceeded',
          rateLimit: {
            remaining: 0,
            resetTime: rateLimit.resetTime
          }
        }
      }

      // Step 9: Update last used timestamp (async, don't wait)
      this.updateLastUsed(keyComponents.uuid).catch(console.error)

      // Success
      return {
        valid: true,
        userId: metadata.userId,
        tier: metadata.tier as 'free' | 'basic' | 'premium',
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime
        }
      }

    } catch (error) {
      console.error('[Security] API key validation error:', error)
      return {
        valid: false,
        error: 'Validation failed'
      }
    }
  }

  /**
   * Generate a new API key with proper format
   */
  async generateApiKey(userId: string, tier: 'free' | 'basic' | 'premium'): Promise<{
    apiKey: string
    hash: string
    uuid: string
  }> {
    const environment = process.env.NODE_ENV === 'production' ? 'live' : 'test'
    const version = 'v1'
    const uuid = crypto.randomUUID()
    const secret = crypto.randomBytes(32).toString('base64url')

    const apiKey = `xbrl_${environment}_${version}_${uuid}_${secret}`
    const hash = await this.computeHMAC(apiKey)

    return {
      apiKey,
      hash,
      uuid
    }
  }
}

// Export singleton instance
export const apiKeyValidator = new EnhancedApiKeyValidator()
