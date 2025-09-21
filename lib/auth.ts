import { supabaseManager } from '@/lib/infrastructure/supabase-manager'

// Sign up with email
export async function signUpWithEmail(email: string, password: string, metadata?: any) {
  const supabase = supabaseManager.getAnonClient()

  try {
    // 登録を試みる
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/processing?next=/dashboard` : undefined
      }
    })

    // エラーチェック
    if (error) {
      // Database error saving new userを特別に処理
      if (error.message === 'Database error saving new user') {
        // 実際にユーザーが作成されたか確認
        const { data: checkUser } = await supabase.auth.getUser()

        if (checkUser?.user) {
          // ユーザーは作成されている場合
          return {
            data: { user: checkUser.user, session: null },
            error: null,
            requiresEmailConfirmation: true
          }
        }

        // 本当にエラーの場合
        return {
          data: null,
          error: {
            message: 'ユーザー登録に失敗しました。時間をおいて再度お試しください。',
            originalMessage: error.message,
            details: 'Database error occurred'
          }
        }
      }

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

      // セッションがない場合、自動的にログインを試みる
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInData?.session) {
        return {
          data: signInData,
          error: null,
          autoSignedIn: true
        }
      }

      // それでもセッションがない場合はメール確認が必要
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
  const supabase = supabaseManager.getAnonClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  return { data, error }
}

// Sign out
export async function signOut() {
  const supabase = supabaseManager.getAnonClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Get current user
export async function getCurrentUser() {
  const supabase = supabaseManager.getAnonClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Send password reset email
export async function sendPasswordResetEmail(email: string) {
  const supabase = supabaseManager.getAnonClient()
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
  })

  if (error) throw error
}

// Update password
export async function updatePassword(newPassword: string) {
  const supabase = supabaseManager.getAnonClient()
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) throw error
}