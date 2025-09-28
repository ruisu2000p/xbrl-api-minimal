import { UnifiedKeyHasher } from './key-hasher';
import { generateBcryptApiKey } from './bcrypt-apikey';
import { logger } from '../utils/logger';
import { supabaseManager } from '../infrastructure/supabase-manager';

export interface AuthResult {
  success: boolean;
  userId?: string;
  apiKeyId?: string;
  hashMethod?: string;
  migrationNeeded?: boolean;
  error?: string;
}

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  key_hash: string;
  salt?: string;
  hash_method: 'base64' | 'sha256-base64' | 'hmac-sha256';
  migration_status: 'pending' | 'in_progress' | 'completed';
  last_used_at?: string;
  usage_count: number;
  status?: 'active' | 'revoked' | 'suspended' | 'expired';
  is_active?: boolean;
  expires_at?: string | null;
}

/**
 * Unified Authentication Manager
 * Handles all API key authentication with backward compatibility
 */
export class UnifiedAuthManager {
  private static get supabase() {
    return supabaseManager.getServiceClient();
  }

  /**
   * Authenticate API key with automatic migration support
   */
  static async authenticateApiKey(apiKey: string): Promise<AuthResult> {
    try {
      // Extract the API key ID from the key (if formatted as id.secret)
      const [keyId, keySecret] = apiKey.includes('.')
        ? apiKey.split('.')
        : [null, apiKey];

      // Try multiple hash methods to find the key
      let keyRecord: ApiKeyRecord | null = null;
      let error: any = null;

      // Import hashApiKey from apiKey.ts to ensure consistency
      const { hashApiKey } = await import('../security/apiKey');

      // First try simple HMAC (used by apiKey.ts)
      const simpleHmacHash = await hashApiKey(apiKey);
      const { data: simpleHmacRecord, error: simpleHmacError } = await this.supabase
        .from('api_keys')
        .select('*')
        .eq('key_hash', simpleHmacHash)
        .single();

      if (simpleHmacRecord) {
        keyRecord = simpleHmacRecord;
      } else {
        // Try HMAC with salt (UnifiedKeyHasher method)
        // Note: This will fail because we don't know the salt beforehand
        // We need to fetch by other means first

        // Fallback to Base64 (legacy)
        const base64Hash = Buffer.from(apiKey).toString('base64');
        const { data: base64Record, error: base64Error } = await this.supabase
          .from('api_keys')
          .select('*')
          .eq('key_hash', base64Hash)
          .single();

        if (base64Record) {
          keyRecord = base64Record;
        } else {
          error = simpleHmacError || base64Error;
        }
      }

      if (error || !keyRecord) {
        logger.warn('API key not found', { keyId });
        return { success: false, error: 'Invalid API key' };
      }

      // Verify based on hash method
      let isValid = false;
      let migrationNeeded = false;

      switch (keyRecord.hash_method) {
        case 'hmac-sha256':
          // New secure method
          isValid = await UnifiedKeyHasher.verifyApiKey(
            keySecret || apiKey,
            keyRecord.key_hash,
            keyRecord.salt
          );
          break;

        case 'base64':
        case 'sha256-base64':
          // Legacy methods - verify and mark for migration
          isValid = await UnifiedKeyHasher.verifyLegacyHash(
            apiKey,
            keyRecord.key_hash,
            keyRecord.hash_method
          );
          migrationNeeded = true;

          // Trigger async migration if valid
          if (isValid) {
            this.migrateLegacyKeyAsync(keyRecord.id, apiKey, keyRecord.hash_method);
          }
          break;

        default:
          logger.error('Unknown hash method', { hashMethod: keyRecord.hash_method });
          return { success: false, error: 'Authentication configuration error' };
      }

      if (!isValid) {
        // Log failed authentication attempt
        await this.logSecurityEvent(keyRecord.id, 'auth_failure');
        return { success: false, error: 'Invalid API key' };
      }

      // Check API key status
      if (keyRecord.status === 'revoked' || keyRecord.status === 'suspended') {
        await this.logSecurityEvent(keyRecord.id, 'auth_failure_revoked', {
          status: keyRecord.status,
        });
        const statusMessage =
          keyRecord.status === 'suspended' ? 'suspended' : 'revoked';
        return {
          success: false,
          error: `API key has been ${statusMessage}`,
        };
      }

      if (keyRecord.status === 'expired') {
        await this.logSecurityEvent(keyRecord.id, 'auth_failure_expired_status', {
          status: keyRecord.status,
        });
        return { success: false, error: 'API key has expired' };
      }

      // Check if key is active
      if (keyRecord.is_active === false) {
        await this.logSecurityEvent(keyRecord.id, 'auth_failure_inactive');
        return { success: false, error: 'API key is inactive' };
      }

      // Check expiration
      if (keyRecord.expires_at) {
        const expiresAt = new Date(keyRecord.expires_at);
        const now = new Date();
        if (now > expiresAt) {
          await this.logSecurityEvent(keyRecord.id, 'auth_failure_expired', {
            expired_at: keyRecord.expires_at
          });
          return { success: false, error: 'API key has expired' };
        }
      }

      // Update usage statistics
      await this.updateUsageStats(keyRecord.id);

      // Log successful authentication
      await this.logSecurityEvent(keyRecord.id, 'auth_success');

      return {
        success: true,
        userId: keyRecord.user_id,
        apiKeyId: keyRecord.id,
        hashMethod: keyRecord.hash_method,
        migrationNeeded
      };
    } catch (error) {
      logger.error('Authentication error', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Async migration of legacy API keys
   */
  private static async migrateLegacyKeyAsync(
    keyId: string,
    apiKey: string,
    currentHashMethod: 'base64' | 'sha256-base64'
  ): Promise<void> {
    try {
      logger.info('Starting legacy key migration', { keyId, currentHashMethod });

      // Mark as in progress
      await this.supabase
        .from('api_keys')
        .update({ migration_status: 'in_progress' })
        .eq('id', keyId);

      // Get current hash for verification
      const { data: keyRecord } = await this.supabase
        .from('api_keys')
        .select('key_hash')
        .eq('id', keyId)
        .single();

      if (!keyRecord) return;

      // Migrate to new hash
      const migrationResult = await UnifiedKeyHasher.migrateLegacyKey(
        apiKey,
        keyRecord.key_hash,
        currentHashMethod
      );

      if (!migrationResult) {
        logger.error('Migration failed - verification failed', { keyId });
        return;
      }

      // Update with new hash
      await this.supabase
        .from('api_keys')
        .update({
          key_hash: migrationResult.hash,
          salt: migrationResult.salt,
          hash_method: 'hmac-sha256',
          migration_status: 'completed',
          security_version: 2,
          last_security_audit: new Date().toISOString()
        })
        .eq('id', keyId);

      // Log migration event
      await this.logSecurityEvent(keyId, 'key_migration', {
        from_method: currentHashMethod,
        to_method: 'hmac-sha256'
      });

      logger.info('Legacy key migration completed', { keyId });
    } catch (error) {
      logger.error('Legacy key migration failed', { keyId, error });

      // Mark migration as failed
      await this.supabase
        .from('api_keys')
        .update({ migration_status: 'pending' })
        .eq('id', keyId);
    }
  }

  /**
   * Update API key usage statistics
   */
  private static async updateUsageStats(apiKeyId: string): Promise<void> {
    await this.supabase.rpc('increment_api_key_usage', {
      key_id: apiKeyId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log security events
   */
  private static async logSecurityEvent(
    apiKeyId: string,
    eventType: string,
    details?: any
  ): Promise<void> {
    try {
      await this.supabase.from('security_events').insert({
        api_key_id: apiKeyId,
        event_type: eventType,
        severity: eventType === 'auth_failure' ? 'medium' : 'low',
        details,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to log security event', { eventType, error });
    }
  }

  /**
   * Create new API key with secure hashing
   */
  static async createApiKey(
    userId: string,
    name?: string,
    tier: 'free' | 'basic' | 'premium' = 'free'
  ): Promise<{ apiKey: string; keyId: string; masked: string }> {
    // Generate new API key using bcrypt system
    const { apiKey, hash, masked } = await generateBcryptApiKey();

    // Store in database
    const { data, error } = await this.supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name: name || 'API Key',
        key_hash: hash,
        hash_method: 'bcrypt',
        migration_status: 'completed',
        security_version: 2,
        tier,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    // Log API key creation
    await this.logSecurityEvent(data.id, 'api_key_created', {
      tier,
      masked
    });

    // Return the full API key (only returned once at creation)
    return {
      apiKey,
      keyId: data.id,
      masked
    };
  }
}