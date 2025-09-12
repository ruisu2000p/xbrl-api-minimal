import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceKey } from '@/lib/utils/env'
import crypto from 'crypto'

// Supabase Auth クライアント（クライアントサイド用）
export function createSupabaseAuthClient() {
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

// Supabase Auth クライアント（サーバーサイド用）
export function createSupabaseAuthServerClient() {
  const supabaseUrl = getSupabaseUrl()
  const supabaseServiceKey = getSupabaseServiceKey()

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

// メール認証でサインアップ
export async function signUpWithEmail(email: string, password: string, metadata?: any) {
  const supabase = createSupabaseAuthClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      data: metadata || {}
    }
  })
  
  return { data, error }
}

// メールでログイン
export async function signInWithEmail(email: string, password: string) {
  const supabase = createSupabaseAuthClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  return { data, error }
}

// ログアウト
export async function signOut() {
  const supabase = createSupabaseAuthClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

// 現在のユーザー取得
export async function getCurrentUser() {
  const supabase = createSupabaseAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// パスワードリセットメール送信
export async function sendPasswordResetEmail(email: string) {
  const supabase = createSupabaseAuthClient()
  
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`
  })
  
  return { data, error }
}

// パスワード更新
export async function updatePassword(newPassword: string) {
  const supabase = createSupabaseAuthClient()
  
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  })
  
  return { data, error }
}

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