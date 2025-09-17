// APIキー関連のユーティリティ関数（サーバーサイド専用）
import { UnifiedAuthManager } from '@/lib/security/auth-manager'
import { maskApiKey as coreMaskApiKey } from '@/lib/security/apiKey'

export async function createManagedApiKey(userId: string, name?: string) {
  return UnifiedAuthManager.createApiKey(userId, name)
}

export function maskApiKey(apiKey: string): string {
  return coreMaskApiKey(apiKey)
}
