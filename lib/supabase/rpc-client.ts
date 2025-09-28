/**
 * Supabase RPC関数の呼び出しヘルパー
 * privateスキーマのデータに安全にアクセスするためのクライアント関数
 */

import { createClient } from '@/utils/supabase/client'
import { createClient as createServerClient } from '@/utils/supabase/server'

// ==========================================
// プロファイル関連
// ==========================================

/**
 * 自分のプロファイルを取得（VIEWから読み取り）
 */
export async function getMyProfile() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('v_profiles')
    .select('*')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()

  if (error) {
    console.error('Failed to fetch profile:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * 自分のプロファイルを更新（RPC関数を使用）
 */
export async function updateMyProfile(updates: {
  username?: string
  full_name?: string
  avatar_url?: string
}) {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('update_my_profile', {
    p_username: updates.username,
    p_full_name: updates.full_name,
    p_avatar_url: updates.avatar_url
  })

  if (error) {
    console.error('Failed to update profile:', error)
    return { success: false, error: error.message }
  }

  return data as { success: boolean; data?: any; error?: string }
}

// ==========================================
// APIキー関連
// ==========================================

/**
 * 自分のAPIキー一覧を取得
 */
export async function getMyApiKeys() {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_my_api_keys')

  if (error) {
    console.error('Failed to fetch API keys:', error)
    return { success: false, error: error.message }
  }

  return data as { success: boolean; data?: any[]; error?: string }
}

/**
 * 新しいAPIキーを生成
 */
export async function generateApiKey(name: string = 'API Key', tier: string = 'free') {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('generate_my_api_key', {
    p_name: name,
    p_tier: tier
  })

  if (error) {
    console.error('Failed to generate API key:', error)
    return { success: false, error: error.message }
  }

  return data as {
    success: boolean
    data?: {
      id: string
      api_key: string  // 初回のみ平文で返される
      masked_key: string
      name: string
      tier: string
      created_at: string
    }
    error?: string
  }
}

/**
 * APIキーを無効化
 */
export async function revokeApiKey(keyId: string) {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('revoke_my_api_key', {
    p_key_id: keyId
  })

  if (error) {
    console.error('Failed to revoke API key:', error)
    return { success: false, error: error.message }
  }

  return data as { success: boolean; message?: string; error?: string }
}

// ==========================================
// 統計情報
// ==========================================

/**
 * 自分の使用統計を取得
 */
export async function getMyUsageStats() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('v_my_usage_stats')
    .select('*')
    .single()

  if (error) {
    console.error('Failed to fetch usage stats:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ==========================================
// サーバーサイド用（Server Components/Actions）
// ==========================================

/**
 * サーバーサイドから自分のプロファイルを取得
 */
export async function getMyProfileServer() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('v_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Failed to fetch profile:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * サーバーサイドから自分のAPIキーを取得
 */
export async function getMyApiKeysServer() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase.rpc('get_my_api_keys')

  if (error) {
    console.error('Failed to fetch API keys:', error)
    return { success: false, error: error.message }
  }

  return data as { success: boolean; data?: any[]; error?: string }
}