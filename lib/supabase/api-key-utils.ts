// APIキー関連のユーティリティ関数（サーバーサイド専用）
import {
  generateApiKey as coreGenerateApiKey,
  hashApiKey,
  maskApiKey as coreMaskApiKey
} from '@/lib/security/apiKey'

// APIキー生成
export function generateApiKey(prefix: string = 'xbrl', tier: string = 'free'): { apiKey: string; keyHash: string } {
  const tierPrefix = tier === 'enterprise' ? 'ent' : tier.substring(0, 3)
  const baseKey = coreGenerateApiKey(`${prefix}_${tierPrefix}`)
  const keyHash = hashApiKey(baseKey)
  return { apiKey: baseKey, keyHash }
}

// APIキーのマスク表示
export function maskApiKey(apiKey: string): string {
  return coreMaskApiKey(apiKey)
}