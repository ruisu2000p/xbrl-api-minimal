'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  deriveApiKeyMetadata,
  generateApiKey,
  maskApiKey,
  resolveTierLimits,
} from '@/lib/security/apiKey'
import type { ApiKey, ApiKeyResponse } from '@/types/api-key'

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
      .select('masked_key, name, status')
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
          ? apiKeys[0].masked_key
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
    let fullApiKey: string | null = null

    try {
      const admin = await createSupabaseServerAdminClient()

      const { tier, limits } = resolveTierLimits(userData.plan)

      const generatedKey = generateApiKey('xbrl_live')
      const keyMetadata = deriveApiKeyMetadata(generatedKey)

      const { error: insertError } = await admin
        .from('api_keys')
        .insert({
          user_id: data.user.id,
          name: 'Default API Key',
          key_hash: keyMetadata.hash,
          key_prefix: keyMetadata.prefix,
          key_suffix: keyMetadata.suffix,
          masked_key: keyMetadata.masked,
          status: 'active',
          is_active: true,
          tier,
          rate_limit_per_minute: limits.perMinute,
          rate_limit_per_hour: limits.perHour,
          rate_limit_per_day: limits.perDay
        })
        .select('id')
        .single()

      if (insertError) {
        throw new Error(insertError.message)
      }

      fullApiKey = generatedKey

    } catch (apiKeyError) {
      console.error('Failed to create API key:', apiKeyError)
      // Rollback user creation on failure
      try {
        const admin = await createSupabaseServerAdminClient()
        await admin.auth.admin.deleteUser(data.user.id)
      } catch (rollbackError) {
        console.error('Failed to rollback user creation:', rollbackError)
      }
      return {
        success: false,
        error: 'APIキーの作成に失敗しました'
      }
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
      },
      apiKey: fullApiKey // Return the API key once for the user to save
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

export async function getUserApiKeys(): Promise<ApiKeyResponse> {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: apiKeys, error } = await supabase
    .from('api_keys')
    .select('id, key_hash, key_prefix, key_suffix, masked_key, name, status, tier, created_at, last_used_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  const formattedKeys: ApiKey[] = apiKeys?.map(key => ({
    id: key.id,
    name: key.name,
    key: key.masked_key
      ?? (key.key_prefix && key.key_suffix
        ? `${key.key_prefix}...${key.key_suffix}`
        : maskApiKey(key.key_hash ?? '')),
    created: new Date(key.created_at).toLocaleDateString('ja-JP'),
    lastUsed: key.last_used_at
      ? new Date(key.last_used_at).toLocaleDateString('ja-JP')
      : '未使用',
    tier: key.tier as ApiKey['tier']
  })) || []

  return {
    success: true,
    data: formattedKeys
  }
}

export async function createApiKey(name: string): Promise<ApiKeyResponse> {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Generate API key
    const { tier, limits } = resolveTierLimits(user.user_metadata?.plan as string | null)

    const fullKey = generateApiKey('xbrl_live')
    const keyMetadata = deriveApiKeyMetadata(fullKey)

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        key_hash: keyMetadata.hash,
        key_prefix: keyMetadata.prefix,
        key_suffix: keyMetadata.suffix,
        masked_key: keyMetadata.masked,
        name: name || 'API Key',
        status: 'active',
        is_active: true,
        rate_limit_per_minute: limits.perMinute,
        rate_limit_per_hour: limits.perHour,
        rate_limit_per_day: limits.perDay,
        tier,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Return the plain text key only once for the user to save
    const newKey: ApiKey = {
      id: data.id,
      name: data.name,
      key: fullKey, // Return the actual key only this once
      created: new Date(data.created_at).toLocaleDateString('ja-JP'),
      lastUsed: '未使用',
      tier: data.tier as ApiKey['tier']
    }

    return {
      success: true,
      data: newKey
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