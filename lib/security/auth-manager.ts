import { createClient } from '@supabase/supabase-js';
import { UnifiedKeyHasher } from './key-hasher';
import { logger } from '../utils/logger';

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
}

/**
 * Unified Authentication Manager
 * Handles all API key authentication with backward compatibility
 */
export class UnifiedAuthManager {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Authenticate API key with automatic migration support
   */
  static async authenticateApiKey(apiKey: string): Promise<AuthResult> {
    try {
      // Extract the API key ID from the key (if formatted as id.secret)
      const [keyId, keySecret] = apiKey.includes('.')
        ? apiKey.split('.')
        : [null, apiKey];

      // Find the API key record
      const { data: keyRecord, error } = await this.supabase
        .from('api_keys')
        .select('*')
        .or(keyId ? `id.eq.${keyId}` : `key_hash.eq.${Buffer.from(apiKey).toString('base64')}`)
        .single();

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
    name?: string
  ): Promise<{ apiKey: string; keyId: string }> {
    // Generate secure random key
    const apiKey = UnifiedKeyHasher.generateApiKey();

    // Hash with HMAC-SHA256
    const { hash, salt } = await UnifiedKeyHasher.hashApiKey(apiKey);

    // Store in database
    const { data, error } = await this.supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name: name || 'API Key',
        key_hash: hash,
        salt,
        hash_method: 'hmac-sha256',
        migration_status: 'completed',
        security_version: 2,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    // Return the key in format: id.secret
    return {
      apiKey: `${data.id}.${apiKey}`,
      keyId: data.id
    };
  }
}