import { createSupabaseClient } from '@/lib/supabase/client'

// Sign up with email
export async function signUpWithEmail(email: string, password: string, metadata?: any) {
  const supabase = createSupabaseClient()

  try {
    // 登録を試みる
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
      }
    })

    // エラーチェック
    if (error) {
      // User already registeredのエラーをキャッチ
      if (error.message.includes('User already registered')) {
        // 既存ユーザーの場合は自動的にログインを試みる
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (signInError) {
          return {
            data: null,
            error: {
              message: 'このメールアドレスは既に登録されています。パスワードが正しくない場合はログインページからパスワードリセットをしてください。',
              originalMessage: error.message
            }
          }
        }

        if (signInData?.session) {
          return {
            data: signInData,
            error: null,
            isExistingUser: true
          }
        }
      }

      return { data, error }
    }

    // 新規登録成功の場合
    if (data.user) {
      // セッションが既にある場合（メール確認不要の設定）
      if (data.session) {
        return { data, error: null }
      }

      // メール確認が必要な場合
      return {
        data,
        error: null,
        requiresEmailConfirmation: true
      }
    }

    return { data, error }
  } catch (err: any) {
    return {
      data: null,
      error: {
        message: `予期しないエラーが発生しました: ${err.message || err}`,
        originalError: err.message || err.toString()
      }
    }
  }
}

// Sign in with email
export async function signInWithEmail(email: string, password: string) {
  const supabase = createSupabaseClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  return { data, error }
}

// Sign out
export async function signOut() {
  const supabase = createSupabaseClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Get current user
export async function getCurrentUser() {
  const supabase = createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Send password reset email
export async function sendPasswordResetEmail(email: string) {
  const supabase = createSupabaseClient()
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
  })

  if (error) throw error
}

// Update password
export async function updatePassword(newPassword: string) {
  const supabase = createSupabaseClient()
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) throw error
}