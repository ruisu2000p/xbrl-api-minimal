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
      const keyPrefix = 'xbrl'
      const keyBody = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      const keySuffix = keyBody.slice(-4)
      const fullKey = `${keyPrefix}_${keyBody}`

      // Hash the API key for secure storage
      const crypto = require('crypto')
      const hashedKey = crypto.createHash('sha256').update(fullKey).digest('hex')

      await supabase
        .from('api_keys')
        .insert({
          user_id: data.user.id,
          key_hash: hashedKey,
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

export async function getUserApiKeys() {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: apiKeys, error } = await supabase
    .from('api_keys')
    .select('id, key_hash, name, status, tier, created_at, last_used_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    data: apiKeys?.map(key => ({
      id: key.id,
      name: key.name,
      key: `${key.key_hash.substring(0, 12)}...${key.key_hash.slice(-8)}`,
      created: new Date(key.created_at).toLocaleDateString('ja-JP'),
      lastUsed: key.last_used_at
        ? new Date(key.last_used_at).toLocaleDateString('ja-JP')
        : '未使用',
      tier: key.tier
    })) || []
  }
}

export async function createApiKey(name: string) {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Generate API key
    const keyPrefix = 'xbrl'
    const keyBody = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const fullKey = `${keyPrefix}_${keyBody}`

    // Hash the API key for secure storage
    const crypto = require('crypto')
    const hashedKey = crypto.createHash('sha256').update(fullKey).digest('hex')

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        key_hash: hashedKey,
        name: name || 'API Key',
        status: 'active',
        tier: 'basic'
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Return the plain text key only once for the user to save
    return {
      success: true,
      data: {
        id: data.id,
        name: data.name,
        key: fullKey, // Return the actual key only this once
        created: new Date(data.created_at).toLocaleDateString('ja-JP'),
        lastUsed: '未使用',
        tier: data.tier
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to create API key' }
  }
}

export async function deleteApiKey(keyId: string) {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('api_keys')
    .update({ status: 'revoked' })
    .eq('id', keyId)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}