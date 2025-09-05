/**
 * Validate API key for authentication
 */
export function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  // 実際の実装では、データベースでAPIキーを確認
  return apiKey.startsWith('xbrl_');
}