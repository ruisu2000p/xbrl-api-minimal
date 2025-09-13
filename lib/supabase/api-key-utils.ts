// APIキー関連のユーティリティ関数（サーバーサイド専用）
import crypto from 'crypto'

// APIキー生成
export function generateApiKey(prefix: string = 'xbrl', tier: string = 'free'): { apiKey: string; keyHash: string } {
  const timestamp = Date.now().toString(36)
  const randomBytes = crypto.randomBytes(24).toString('hex')
  const tierPrefix = tier === 'enterprise' ? 'ent' : tier.substring(0, 3)
  const apiKey = `${prefix}_${tierPrefix}_${timestamp}_${randomBytes}`
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
  
  return { apiKey, keyHash }
}

// APIキーのマスク表示
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 20) return apiKey
  return `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
}