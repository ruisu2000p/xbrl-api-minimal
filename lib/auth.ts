import { createSupabaseClient } from '@/lib/supabase/client'

// Sign up with email
export async function signUpWithEmail(email: string, password: string, metadata?: any) {
  const supabase = createSupabaseClient()

  try {
    // まず既存ユーザーをチェック
    const { data: existingUser } = await supabase.auth.signInWithPassword({
      email,
      password: 'dummy_check_password_12345' // 意図的に間違ったパスワード
    }).catch(() => ({ data: null }))

    // 登録を試みる
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
      }
    })

    // エラーの詳細を処理
    if (error) {
      // Database error saving new userの場合、より詳しいエラーメッセージに変換
      if (error.message === 'Database error saving new user') {
        return {
          data,
          error: {
            ...error,
            message: 'ユーザー登録でデータベースエラーが発生しました。このメールアドレスは既に登録されている可能性があります。',
            originalMessage: error.message,
            status: (error as any)?.status,
            code: (error as any)?.code
          }
        }
      }

      return { data, error }
    }

    // 登録成功後、自動的にサインインを試みる
    if (data.user) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      // サインイン成功時はそのデータを返す
      if (signInData?.session) {
        return { data: signInData, error: signInError }
      }
    }

    return { data, error }
  } catch (err: any) {
    return {
      data: null,
      error: {
        message: `予期しないエラーが発生しました: ${err.message || err}`,
        originalError: err.message || err.toString(),
        ...(err as any)
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