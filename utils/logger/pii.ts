/**
 * PII Masking Utilities
 *
 * Always-on data redaction for production safety.
 * Masks emails, tokens, authorization headers, and sensitive keys.
 */

/**
 * Mask email address: user@example.com → us***@example.com
 */
export function maskEmail(email?: string | null): string | undefined {
  if (!email) return undefined;

  const parts = email.split('@');
  if (parts.length !== 2) return '[INVALID_EMAIL]';

  const [local, domain] = parts;
  const visibleChars = Math.min(2, local.length);
  const masked = local.substring(0, visibleChars) + '***';

  return `${masked}@${domain}`;
}

/**
 * Redact sensitive values from object
 */
export function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const redacted: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Redact authorization headers and tokens
    if (
      lowerKey.includes('token') ||
      lowerKey.includes('authorization') ||
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('key')
    ) {
      redacted[key] = '[REDACTED]';
      continue;
    }

    // Mask email addresses
    if (lowerKey.includes('email')) {
      redacted[key] = typeof value === 'string' ? maskEmail(value) : value;
      continue;
    }

    // Recursively redact nested objects
    if (value && typeof value === 'object') {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}
