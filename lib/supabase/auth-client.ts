// クライアントサイド専用の認証関数
import { createClient } from '@supabase/supabase-js'

// クライアント用Supabaseクライアント作成
export function createSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

// メールアドレスでサインアップ
export async function signUpWithEmail(email: string, password: string, metadata?: any) {
  const supabase = createSupabaseAuthClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  })

  if (error) throw error
  return data
}

// メールアドレスでサインイン
export async function signInWithEmail(email: string, password: string) {
  const supabase = createSupabaseAuthClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error
  return data
}

// サインアウト
export async function signOut() {
  const supabase = createSupabaseAuthClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
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
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) throw error
}

// パスワード更新
export async function updatePassword(newPassword: string) {
  const supabase = createSupabaseAuthClient()
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) throw error
}