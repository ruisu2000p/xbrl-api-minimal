import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { UnifiedKeyHasher } from './key-hasher';
import { maskApiKey } from './apiKey';
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
  salt?: string | null;
  hash_method: 'base64' | 'sha256-base64' | 'hmac-sha256' | 'hmac-sha256-hex';
  migration_status: 'pending' | 'in_progress' | 'completed';
  last_used_at?: string | null;
  usage_count?: number | null;
  name?: string | null;
  status?: string | null;
  tier?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, any> | null;
  masked_key?: string | null;
  key_prefix?: string | null;
  key_suffix?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface ApiKeyCreateOptions {
  name?: string;
  description?: string;
  status?: string;
  tier?: string;
  expiresAt?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
  rateLimits?: {
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };
  extraFields?: Record<string, any>;
}

type LegacyHashMethod = 'base64' | 'sha256-base64' | 'hmac-sha256-hex';

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
      if (!apiKey) {
        return { success: false, error: 'Invalid API key' };
      }

      const [keyId, keySecret] = apiKey.includes('.')
        ? apiKey.split('.', 2)
        : [null, apiKey];

      let keyRecord: ApiKeyRecord | null = null;
      let lookupError: unknown = null;

      if (keyId) {
        const { data, error } = await this.supabase
          .from('api_keys')
          .select('*')
          .eq('id', keyId)
          .maybeSingle();

        if (error) {
          lookupError = error;
        } else {
          keyRecord = (data as ApiKeyRecord) ?? null;
        }
      }

      if (!keyRecord) {
        const legacyMethods: LegacyHashMethod[] = [
          'hmac-sha256-hex',
          'sha256-base64',
          'base64'
        ];

        for (const method of legacyMethods) {
          try {
            const hashValue = UnifiedKeyHasher.legacyHashValue(apiKey, method);
            const { data } = await this.supabase
              .from('api_keys')
              .select('*')
              .eq('key_hash', hashValue)
              .maybeSingle();

            if (data) {
              keyRecord = data as ApiKeyRecord;
              break;
            }
          } catch (error) {
            lookupError = error;
          }
        }
      }

      if (!keyRecord) {
        if (lookupError) {
          logger.warn('API key lookup error', lookupError);
        }
        logger.warn('API key not found', { keyId });
        return { success: false, error: 'Invalid API key' };
      }

      const secret = keyId ? keySecret : apiKey;

      if (!secret) {
        return { success: false, error: 'Invalid API key format' };
      }

      let isValid = false;
      let migrationNeeded = false;
      const hashMethod = keyRecord.hash_method;

      switch (hashMethod) {
        case 'hmac-sha256':
          if (!keyRecord.salt) {
            logger.error('Missing salt for HMAC-SHA256 key', { keyId: keyRecord.id });
            return { success: false, error: 'Authentication configuration error' };
          }
          isValid = await UnifiedKeyHasher.verifyApiKey(
            secret,
            keyRecord.key_hash,
            keyRecord.salt
          );
          break;

        case 'hmac-sha256-hex':
        case 'sha256-base64':
        case 'base64':
          isValid = await UnifiedKeyHasher.verifyLegacyHash(
            secret,
            keyRecord.key_hash,
            hashMethod as LegacyHashMethod
          );
          migrationNeeded = true;

          if (isValid) {
            this.migrateLegacyKeyAsync(keyRecord.id, secret, hashMethod as LegacyHashMethod);
          }
          break;

        default:
          logger.error('Unknown hash method', { hashMethod });
          return { success: false, error: 'Authentication configuration error' };
      }

      if (!isValid) {
        await this.logSecurityEvent(keyRecord.id, 'auth_failure');
        return { success: false, error: 'Invalid API key' };
      }

      await this.updateUsageStats(keyRecord.id);
      await this.logSecurityEvent(keyRecord.id, 'auth_success');

      return {
        success: true,
        userId: keyRecord.user_id,
        apiKeyId: keyRecord.id,
        hashMethod,
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
    currentHashMethod: LegacyHashMethod
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
    options: ApiKeyCreateOptions = {}
  ): Promise<{ apiKey: string; keyId: string; record: ApiKeyRecord }> {
    const secret = UnifiedKeyHasher.generateApiKey();
    const { hash, salt } = await UnifiedKeyHasher.hashApiKey(secret);

    const keyId = randomUUID();
    const apiKeyValue = `${keyId}.${secret}`;
    const masked = maskApiKey(apiKeyValue);
    const now = new Date().toISOString();

    const insertData: Record<string, any> = {
      id: keyId,
      user_id: userId,
      name: options.name ?? name ?? 'API Key',
      description: options.description,
      status: options.status ?? 'active',
      tier: options.tier ?? 'free',
      expires_at: options.expiresAt ?? null,
      is_active: options.isActive ?? true,
      metadata: options.metadata ?? {},
      key_hash: hash,
      salt,
      hash_method: 'hmac-sha256',
      migration_status: 'completed',
      security_version: 2,
      masked_key: masked,
      key_prefix: keyId,
      key_suffix: secret.slice(-4),
      created_at: now,
      last_security_audit: now
    };

    if (options.rateLimits) {
      if (options.rateLimits.perMinute !== undefined) {
        insertData.rate_limit_per_minute = options.rateLimits.perMinute;
      }
      if (options.rateLimits.perHour !== undefined) {
        insertData.rate_limit_per_hour = options.rateLimits.perHour;
      }
      if (options.rateLimits.perDay !== undefined) {
        insertData.rate_limit_per_day = options.rateLimits.perDay;
      }
    }

    if (options.extraFields) {
      Object.assign(insertData, options.extraFields);
    }

    const { data, error } = await this.supabase
      .from('api_keys')
      .insert(insertData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create API key: ${error?.message ?? 'unknown error'}`);
    }

    return {
      apiKey: apiKeyValue,
      keyId,
      record: data as ApiKeyRecord
    };
  }
}