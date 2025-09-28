import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Bcrypt-based API Key Management
 */

export interface BcryptApiKeyResult {
  apiKey: string;
  hash: string;
  prefix: string;
  suffix: string;
  masked: string;
}

export async function generateBcryptApiKey(): Promise<BcryptApiKeyResult> {
  const randomBytes = crypto.randomBytes(32);
  const randomString = randomBytes.toString('hex');
  const apiKey = `xbrl_v1_${randomString}`;
  const hash = await bcrypt.hash(apiKey, 10);
  const prefix = apiKey.substring(0, 12);
  const suffix = apiKey.slice(-4);
  const masked = `${prefix}****${suffix}`;

  return {
    apiKey,
    hash,
    prefix,
    suffix,
    masked
  };
}

export async function verifyBcryptApiKey(
  apiKey: string,
  storedHash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(apiKey, storedHash);
  } catch (error) {
    console.error('API key verification error:', error);
    return false;
  }
}

export function isValidApiKeyFormat(apiKey: string): boolean {
  const pattern = /^xbrl_v1_[a-f0-9]{64}$/;
  return pattern.test(apiKey);
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 16) return apiKey;
  const prefix = apiKey.substring(0, 12);
  const suffix = apiKey.slice(-4);
  return `${prefix}****${suffix}`;
}

// Legacy function names for backward compatibility
export const generateApiKey = generateBcryptApiKey;
export const hashApiKey = async (apiKey: string) => {
  return await bcrypt.hash(apiKey, 10);
};
export const createApiKey = generateBcryptApiKey;
export const extractApiKeyPrefix = (apiKey: string) => apiKey.substring(0, 12);
export const extractApiKeySuffix = (apiKey: string) => apiKey.slice(-4);
