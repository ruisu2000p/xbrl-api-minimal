'use server'

import { redirect } from 'next/navigation'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'
import { revalidatePath } from 'next/cache'
import {
  generateApiKey,
  hashApiKey,
  extractApiKeyPrefix,
  extractApiKeySuffix,
  maskApiKey
} from '@/lib/security/apiKey'
import type { ApiKey, ApiKeyResponse } from '@/types/api-key'

export async function signIn(email: string, password: string) {
  const supabase = await supabaseManager.createSSRClient()

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
  const supabase = await supabaseManager.createSSRClient()

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
  const supabase = await supabaseManager.createSSRClient()

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
      const admin = await supabaseManager.createAdminSSRClient()

      const tier = userData.plan === 'freemium' ? 'free'
        : userData.plan === 'standard' ? 'basic'  // standardをbasicにマッピング
        : 'basic'

      // Use the O(1) optimized Supabase function
      const { data: result, error: createError } = await admin
        .rpc('create_api_key_complete_v2', {
          p_user_id: data.user.id,
          p_name: 'Default API Key',
          p_description: `${userData.plan} plan - Auto created`,
          p_tier: tier
        })

      if (createError) {
        console.error('API Key creation error:', createError)
        throw new Error(`API Key creation failed: ${createError.message}`)
      }

      if (!result?.success) {
        console.error('API Key creation failed:', result)
        throw new Error('APIキーの作成に失敗しました')
      }

      fullApiKey = result.api_key

    } catch (apiKeyError) {
      console.error('Failed to create API key:', apiKeyError)
      // APIキー作成に失敗してもユーザーは作成済みなので続行
      console.warn('User created but API key creation failed. User can create API key later from dashboard.')
      // ユーザー削除はしない - ダッシュボードから後でAPIキーを作成可能
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
  const supabase = await supabaseManager.createSSRClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

export async function getUserApiKeys(): Promise<ApiKeyResponse> {
  const supabase = await supabaseManager.createSSRClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: apiKeys, error } = await supabase
    .from('api_keys')
    .select('id, key_hash, masked_key, name, status, tier, created_at, last_used_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  const formattedKeys: ApiKey[] = apiKeys?.map(key => ({
    id: key.id,
    name: key.name,
    key: key.masked_key ?? maskApiKey(key.key_hash ?? ''),
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
  const supabase = await supabaseManager.createSSRClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Generate API key with new format
    const fullKey = generateApiKey('xbrl_live')
    const hashedKey = await hashApiKey(fullKey)  // Added await here
    const keyPrefix = extractApiKeyPrefix(fullKey)
    const keySuffix = extractApiKeySuffix(fullKey)

    // Extract UUID from the new format: xbrl_live_v1_{uuid}_{secret}
    const keyParts = fullKey.split('_');
    const uuid = keyParts[3]; // UUID is the 4th part (index 3)

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        id: uuid, // Use the UUID as the ID
        user_id: user.id,
        key_hash: hashedKey.hash,  // Use hashedKey.hash instead of hashedKey
        salt: hashedKey.salt,      // Add salt field
        key_prefix: keyPrefix,
        key_suffix: keySuffix,
        masked_key: maskApiKey(fullKey),
        name: name || 'API Key',
        status: 'active',
        is_active: true,
        rate_limit_per_minute: 100,
        rate_limit_per_hour: 2000,
        rate_limit_per_day: 50000,
        tier: 'free' // Default to free tier
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
  const supabase = await supabaseManager.createSSRClient()

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