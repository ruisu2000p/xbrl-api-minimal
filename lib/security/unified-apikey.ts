import crypto from 'crypto';
import { UnifiedKeyHasher } from './key-hasher';

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Unified API Key Management System
 *
 * This module provides a consistent API key management system that:
 * - Generates secure API keys with prefixes
 * - Uses HMAC-SHA256 with salt for hashing
 * - Supports legacy key migration
 * - Provides key masking for display
 */

export interface ApiKeyGenerationResult {
  apiKey: string;
  hash: string;
  salt: string;
  masked: string;
}

export interface ApiKeyVerificationResult {
  isValid: boolean;
  needsMigration?: boolean;
}

/**
 * Generate a new API key with secure random characters
 */
export function generateApiKey(prefix = 'xbrl_live', size = 32): string {
  const bytes = crypto.randomBytes(size);
  const chars = Array.from(bytes)
    .map((b) => BASE62[b % BASE62.length])
    .join('');
  return `${prefix}_${chars}`;
}

/**
 * Generate and hash a new API key
 */
export async function createApiKey(
  prefix = 'xbrl_live',
  size = 32
): Promise<ApiKeyGenerationResult> {
  const apiKey = generateApiKey(prefix, size);
  const { hash, salt } = await UnifiedKeyHasher.hashApiKey(apiKey);
  const masked = maskApiKey(apiKey);

  return {
    apiKey,
    hash,
    salt,
    masked
  };
}

/**
 * Verify an API key against stored hash
 */
export async function verifyApiKey(
  apiKey: string,
  storedHash: string,
  salt?: string
): Promise<ApiKeyVerificationResult> {
  // If salt is provided, use new HMAC-SHA256 verification
  if (salt) {
    const isValid = await UnifiedKeyHasher.verifyApiKey(apiKey, storedHash, salt);
    return { isValid };
  }

  // Check if it's a legacy hex hash (SHA256 without salt)
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const legacyHash = crypto.createHmac('sha256', getHmacSecret())
      .update(apiKey)
      .digest('hex');
    const isValid = storedHash === legacyHash;
    return { isValid, needsMigration: isValid };
  }

  // Check if it's a legacy base64 hash
  if (/^[A-Za-z0-9+/]+=*$/.test(storedHash)) {
    const isValid = await UnifiedKeyHasher.verifyLegacyHash(
      apiKey,
      storedHash,
      'sha256-base64'
    );
    return { isValid, needsMigration: isValid };
  }

  return { isValid: false };
}

/**
 * Hash an existing API key (for legacy compatibility)
 */
export async function hashApiKey(apiKey: string): Promise<{ hash: string; salt: string }> {
  return UnifiedKeyHasher.hashApiKey(apiKey);
}

/**
 * Mask API key for display
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) return apiKey;

  const parts = apiKey.split('_');
  const prefix = parts.length > 1 ? parts.slice(0, 2).join('_') : apiKey.slice(0, 8);
  const suffix = apiKey.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * Extract prefix from API key
 */
export function extractApiKeyPrefix(apiKey: string): string {
  const parts = apiKey.split('_');
  return parts.length >= 2 ? `${parts[0]}_${parts[1]}` : parts[0];
}

/**
 * Extract suffix from API key
 */
export function extractApiKeySuffix(apiKey: string): string {
  return apiKey.slice(-4);
}

/**
 * Get HMAC secret for legacy compatibility
 */
function getHmacSecret(): Buffer {
  const rawSecret =
    process.env.KEY_DERIVE_SECRET ??
    process.env.API_KEY_SECRET ??
    process.env.KEY_PEPPER;

  if (!rawSecret) {
    throw new Error('KEY_DERIVE_SECRET (or API_KEY_SECRET/KEY_PEPPER) environment variable is not set');
  }

  // Decode base64 if applicable
  const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
  if (base64Pattern.test(rawSecret) && rawSecret.length % 4 === 0) {
    try {
      return Buffer.from(rawSecret, 'base64');
    } catch {
      // Fall through to UTF-8
    }
  }

  return Buffer.from(rawSecret, 'utf-8');
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  // Check for prefix_randomchars format
  const pattern = /^[a-zA-Z]+_[a-zA-Z]+_[A-Za-z0-9]{20,}$/;
  return pattern.test(apiKey);
}

/**
 * Generate a secure random ID (for id.secret format)
 */
export function generateSecureId(length = 16): string {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => BASE62[b % BASE62.length])
    .join('');
}

/**
 * Create an id.secret format API key
 */
export function createIdSecretKey(): { id: string; secret: string; apiKey: string } {
  const id = generateSecureId(16);
  const secret = generateSecureId(32);
  const apiKey = `${id}.${secret}`;

  return { id, secret, apiKey };
}

/**
 * Parse id.secret format API key
 */
export function parseIdSecretKey(apiKey: string): { id: string; secret: string } | null {
  const parts = apiKey.split('.');
  if (parts.length !== 2) return null;

  const [id, secret] = parts;
  if (!id || !secret) return null;

  return { id, secret };
}