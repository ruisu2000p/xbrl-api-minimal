import { createClient } from '@supabase/supabase-js'

// Create Supabase client for authentication
function createSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

// Sign up with email
export async function signUpWithEmail(email: string, password: string, metadata?: any) {
  const supabase = createSupabaseAuthClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  })

  return { data, error }
}

// Sign in with email
export async function signInWithEmail(email: string, password: string) {
  const supabase = createSupabaseAuthClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  return { data, error }
}

// Sign out
export async function signOut() {
  const supabase = createSupabaseAuthClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Get current user
export async function getCurrentUser() {
  const supabase = createSupabaseAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Send password reset email
export async function sendPasswordResetEmail(email: string) {
  const supabase = createSupabaseAuthClient()
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
  })

  if (error) throw error
}

// Update password
export async function updatePassword(newPassword: string) {
  const supabase = createSupabaseAuthClient()
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) throw error
}