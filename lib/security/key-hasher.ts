import crypto from 'crypto';

/**
 * Unified API Key Hasher - HMAC-SHA256 implementation
 * Replaces all existing hash methods (Base64, SHA256+Base64) with secure HMAC-SHA256
 */
export class UnifiedKeyHasher {
  private static readonly ALGORITHM = 'sha256';
  private static readonly ENCODING = 'base64';
  private static readonly SALT_LENGTH = 16;

  private static resolveSecret(): string {
    const secret =
      process.env.KEY_DERIVE_SECRET ??
      process.env.API_KEY_SECRET ??
      process.env.KEY_PEPPER;

    if (!secret) {
      throw new Error('KEY_DERIVE_SECRET (or API_KEY_SECRET/KEY_PEPPER) environment variable is not set');
    }

    return secret;
  }

  /**
   * Generate a cryptographically secure salt
   */
  private static generateSalt(): string {
    return crypto.randomBytes(this.SALT_LENGTH).toString('hex');
  }

  /**
   * Hash API key using HMAC-SHA256 with salt
   */
  static async hashApiKey(apiKey: string): Promise<{ hash: string; salt: string }> {
    const secret = this.resolveSecret();

    const salt = this.generateSalt();
    const hmac = crypto.createHmac(this.ALGORITHM, secret);
    hmac.update(apiKey + salt);
    const hash = hmac.digest(this.ENCODING);

    return { hash, salt };
  }

  /**
   * Verify API key against stored hash
   */
  static async verifyApiKey(
    apiKey: string,
    storedHash: string,
    salt?: string
  ): Promise<boolean> {
    const secret = this.resolveSecret();

    const hmac = crypto.createHmac(this.ALGORITHM, secret);
    hmac.update(apiKey + (salt || ''));
    const computedHash = hmac.digest(this.ENCODING);

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(storedHash, this.ENCODING),
      Buffer.from(computedHash, this.ENCODING)
    );
  }

  /**
   * Legacy hash verification for backward compatibility during migration
   */
  static async verifyLegacyHash(
    apiKey: string,
    storedHash: string,
    hashMethod: 'base64' | 'sha256-base64'
  ): Promise<boolean> {
    switch (hashMethod) {
      case 'base64':
        // Legacy Base64 encoding (most vulnerable)
        const base64Hash = Buffer.from(apiKey).toString('base64');
        return storedHash === base64Hash;

      case 'sha256-base64':
        // Legacy SHA256 + Base64
        const sha256Hash = crypto.createHash('sha256')
          .update(apiKey)
          .digest('base64');
        return storedHash === sha256Hash;

      default:
        return false;
    }
  }

  /**
   * Migrate legacy hash to new HMAC-SHA256 format
   */
  static async migrateLegacyKey(
    apiKey: string,
    currentHash: string,
    hashMethod: 'base64' | 'sha256-base64'
  ): Promise<{ hash: string; salt: string } | null> {
    // First verify the key with legacy method
    const isValid = await this.verifyLegacyHash(apiKey, currentHash, hashMethod);

    if (!isValid) {
      return null;
    }

    // Generate new HMAC-SHA256 hash
    return await this.hashApiKey(apiKey);
  }

  /**
   * Generate a secure API key
   */
  static generateApiKey(): string {
    // Generate 32 bytes of random data and encode as base64url
    return crypto.randomBytes(32)
      .toString('base64url')
      .replace(/[^a-zA-Z0-9]/g, ''); // Remove special characters for compatibility
  }
}