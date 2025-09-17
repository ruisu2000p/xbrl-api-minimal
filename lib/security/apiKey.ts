/**
 * Utilities for working with API keys in their public-facing form.
 * The new key format is "<uuid>.<secret>" but we continue supporting
 * legacy keys for migration purposes.
 */

const LEGACY_KEY_PATTERN = /^xbrl_[A-Za-z0-9]{16,}$/;
const UUID_SECRET_PATTERN = /^[0-9a-fA-F-]{36}\.[A-Za-z0-9]{16,}$/;

export function maskApiKey(apiKey: string): string {
  if (!apiKey) {
    return '';
  }

  const [idPart, secretPart] = apiKey.split('.', 2);

  if (!secretPart) {
    // Legacy key style (no id separator)
    if (apiKey.length <= 8) {
      return apiKey;
    }
    return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
  }

  const start = secretPart.slice(0, 4);
  const end = secretPart.slice(-4);
  return `${idPart}.${start}...${end}`;
}

export function extractApiKeyPrefix(apiKey: string): string {
  if (!apiKey) return '';
  const [idPart] = apiKey.split('.', 2);
  return idPart ?? '';
}

export function extractApiKeySuffix(apiKey: string): string {
  if (!apiKey) return '';
  const parts = apiKey.split('.', 2);
  const secret = parts[1] ?? parts[0] ?? '';
  return secret.slice(-4);
}

export function isValidApiKeyFormat(apiKey: string): boolean {
  if (!apiKey) return false;
  return UUID_SECRET_PATTERN.test(apiKey) || LEGACY_KEY_PATTERN.test(apiKey);
}

export function parseApiKey(apiKey: string): { id?: string; secret: string } | null {
  if (!apiKey) return null;
  const [idPart, secretPart] = apiKey.split('.', 2);

  if (secretPart) {
    return { id: idPart, secret: secretPart };
  }

  if (LEGACY_KEY_PATTERN.test(apiKey)) {
    return { secret: apiKey };
  }

  return null;
}
