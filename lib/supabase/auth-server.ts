// サーバーサイド専用の認証関数（APIキー生成など）
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// サーバー用Supabaseクライアント作成（Service Role Key使用）
export function createSupabaseAuthServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase server environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// APIキー生成（サーバーサイドのみ）
export function generateApiKey(prefix: string = 'xbrl', tier: string = 'free'): { apiKey: string; keyHash: string } {
  const timestamp = Date.now().toString(36)
  const randomPart = crypto.randomBytes(16).toString('hex')
  const apiKey = `${prefix}_${tier}_${timestamp}_${randomPart}`
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
  
  return { apiKey, keyHash }
}

// APIキーマスク（表示用）
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) return '***'
  return `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
}