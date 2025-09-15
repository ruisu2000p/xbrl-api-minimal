'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function signIn(email: string, password: string) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      success: false,
      error: error.message
    }
  }

  if (data?.user) {
    // APIキー情報を取得（認証されたユーザーとして）
    const { data: apiKeys } = await supabase
      .from('api_keys')
      .select('key_hash, name, status')
      .eq('user_id', data.user.id)
      .eq('status', 'active')
      .limit(1)

    // ページを再検証
    revalidatePath('/dashboard', 'layout')

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.name || '',
        company: data.user.user_metadata?.company || null,
        plan: data.user.user_metadata?.plan || 'beta',
        apiKey: apiKeys && apiKeys.length > 0
          ? `${apiKeys[0].key_hash.substring(0, 12)}...${apiKeys[0].key_hash.slice(-4)}`
          : null,
      }
    }
  }

  return {
    success: false,
    error: 'ログインに失敗しました'
  }
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

export async function signUp(userData: {
  email: string;
  password: string;
  name: string;
  company?: string;
  plan: string;
  billingPeriod: string;
}) {
  const supabase = await createSupabaseServerClient()

  // Create user account
  const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      data: {
        name: userData.name,
        company: userData.company || null,
        plan: userData.plan,
        billing_period: userData.billingPeriod
      }
    }
  })

  if (error) {
    return {
      success: false,
      error: error.message
    }
  }

  if (data?.user) {
    // Create API key for the new user
    try {
      // Use the same client for API key creation (relying on RLS policies)
      const keyPrefix = 'fin_live_sk'
      const keyBody = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      const keySuffix = keyBody.slice(-4)
      const fullKey = `${keyPrefix}_${keyBody}`

      await supabase
        .from('api_keys')
        .insert({
          user_id: data.user.id,
          key_hash: fullKey, // In production, this should be hashed
          name: 'Default API Key',
          status: 'active',
          tier: userData.plan === 'freemium' ? 'free' : 'basic'
        })

    } catch (apiKeyError) {
      console.error('Failed to create API key:', apiKeyError)
      // Don't fail the signup for this
    }

    revalidatePath('/dashboard', 'layout')

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email!,
        name: userData.name,
        company: userData.company || null,
        plan: userData.plan
      }
    }
  }

  return {
    success: false,
    error: 'アカウント作成に失敗しました'
  }
}

export async function getUser() {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}