import { createSupabaseClient } from '@/lib/supabase/client'

// Sign up with email
export async function signUpWithEmail(email: string, password: string, metadata?: any) {
  const supabase = createSupabaseClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
    }
  })

  // 登録成功後、自動的にサインインを試みる
  if (data.user && !error) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    // サインイン成功時はそのデータを返す
    if (signInData.session) {
      return { data: signInData, error: signInError }
    }
  }

  return { data, error }
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