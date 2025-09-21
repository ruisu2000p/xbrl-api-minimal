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
 * Generate a new API key with secure random characters (長い形式専用)
 */
export function generateApiKey(size = 43): string {
  // Generate UUID v4 for the public ID
  const uuid = crypto.randomUUID();

  // Generate random secret
  const charsArr: string[] = [];
  while (charsArr.length < size) {
    const byte = crypto.randomBytes(1)[0];
    if (byte >= BASE62.length * Math.floor(256 / BASE62.length)) {
      continue; // discard biased value
    }
    charsArr.push(BASE62[byte % BASE62.length]);
  }
  const chars = charsArr.join('');

  // 長い形式専用: xbrl_live_v1_{uuid}_{secret}
  return `xbrl_live_v1_${uuid}_${chars}`;
}

/**
 * Generate and hash a new API key (長い形式専用)
 */
export async function createApiKey(
  size = 43
): Promise<ApiKeyGenerationResult> {
  const apiKey = generateApiKey(size);
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
    const legacyHash = crypto.createHmac('sha256', Uint8Array.from(getHmacSecret()))
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
 * Mask API key for display (長い形式専用)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) return apiKey;

  const lastUnderscoreIndex = apiKey.lastIndexOf('_');
  if (lastUnderscoreIndex <= 0) return apiKey;

  const prefix = apiKey.slice(0, lastUnderscoreIndex + 5); // プリフィックス + シークレットの最初の4文字
  const suffix = apiKey.slice(-4);
  const maskedLength = apiKey.length - prefix.length - suffix.length;
  const masking = '*'.repeat(maskedLength);

  return `${prefix}${masking}${suffix}`;
}

/**
 * Extract prefix from API key (長い形式専用)
 */
export function extractApiKeyPrefix(apiKey: string): string {
  const lastUnderscoreIndex = apiKey.lastIndexOf('_');
  if (lastUnderscoreIndex <= 0) return apiKey;
  return apiKey.slice(0, lastUnderscoreIndex);
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