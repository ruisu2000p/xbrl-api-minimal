'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'
import { revalidatePath } from 'next/cache'
import {
  generateApiKey,
  hashApiKey,
  createApiKey as generateNewApiKey,
  extractApiKeyPrefix,
  extractApiKeySuffix,
  maskApiKey
} from '@/lib/security/unified-apikey'
import { checkRateLimit } from '@/lib/security/csrf'
import {
  emailSchema,
  passwordSchema,
  apiKeyNameSchema,
  sanitizeInput,
  sanitizeError
} from '@/lib/security/input-validation'
import type { ApiKey, ApiKeyResponse } from '@/types/api-key'

export async function signIn(email: string, password: string) {
  try {
    // Validate inputs
    const validatedEmail = emailSchema.parse(email)
    const validatedPassword = passwordSchema.parse(password)

    // Rate limiting
    const headersList = headers()
    const clientIp = headersList.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(`signin:${clientIp}`, 5, 300000)) { // 5 attempts per 5 minutes
      return {
        success: false,
        error: 'Too many login attempts. Please try again later.'
      }
    }

    const supabase = await supabaseManager.createSSRClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedEmail,
      password: validatedPassword,
    })

    if (error) {
      return {
        success: false,
        error: sanitizeError(error)
      }
    }

    if (data?.user) {
      // Get API key information for authenticated user
      const { data: apiKeys } = await supabase
        .from('api_keys')
        .select('masked_key, name, status')
        .eq('user_id', data.user.id)
        .eq('status', 'active')
        .limit(1)

      // Revalidate page
      revalidatePath('/dashboard', 'layout')

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email!,
          name: sanitizeInput(data.user.user_metadata?.name || ''),
          company: sanitizeInput(data.user.user_metadata?.company || ''),
          plan: data.user.user_metadata?.plan || 'beta',
          apiKey: apiKeys && apiKeys.length > 0
            ? apiKeys[0].masked_key
            : null,
        }
      }
    }

    return {
      success: false,
      error: 'Login failed'
    }
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error)
    }
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

      // Use the create_api_key_complete_v2 function with corrected response handling
      const { data: result, error: createError } = await admin
        .rpc('create_api_key_complete_v2', {
          p_user_id: data.user.id,
          p_name: 'Default API Key',
          p_tier: tier
        })

      if (createError) {
        console.error('API Key creation error:', createError)
        throw new Error(`API Key creation failed: ${createError.message}`)
      }

      if (!result || !result.api_key) {
        console.error('API Key creation failed:', result)
        throw new Error('APIキーの作成に失敗しました')
      }

      fullApiKey = result.api_key

      console.log('API Key created successfully:', {
        key_id: result.key_id,
        name: result.name,
        tier: result.tier
      })

    } catch (apiKeyError) {
      console.error('Failed to create API key:', apiKeyError)
      // Continue even if API key creation fails since user is already created
      console.warn('User created but API key creation failed. User can create API key later from dashboard.')
      // Do not delete user - API key can be created later from dashboard
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
    error: 'Account creation failed'
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
  try {
    const supabase = supabaseManager.getBrowserClient()

    // クライアントサイドで認証状態を確認
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user) {
      return { success: false, error: 'Not authenticated' }
    }

    // APIキーをデータベースから直接取得（RLSポリシーで自動的にuser_idでフィルタリング）
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, tier, is_active, created_at, last_used_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching API keys:', error);
      return {
        success: false,
        error: 'APIキーの取得に失敗しました'
      }
    }

    const formattedKeys: ApiKey[] = (apiKeys || []).map((key: any) => ({
      id: key.id,
      name: key.name,
      key: key.key_prefix ? `${key.key_prefix}****` : `api_key****${key.id.slice(-4)}`, // マスク済みキー
      created: new Date(key.created_at).toLocaleDateString('ja-JP'),
      lastUsed: key.last_used_at
        ? new Date(key.last_used_at).toLocaleDateString('ja-JP')
        : '未使用',
      tier: (key.tier || 'free') as ApiKey['tier']
    }))

    return {
      success: true,
      data: formattedKeys
    }
  } catch (error) {
    console.error('Failed to get API keys:', error)
    return { success: false, error: 'Failed to get API keys' }
  }
}

export async function createApiKey(name: string): Promise<ApiKeyResponse> {
  try {
    const supabase = supabaseManager.getBrowserClient()

    // クライアントサイドで認証状態を確認
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user) {
      return { success: false, error: 'Not authenticated' }
    }

    // APIキーを生成（32文字のランダム文字列）
    const randomString = Array.from({ length: 32 }, () =>
      Math.random().toString(36)[2] || '0'
    ).join('');
    const apiKey = `xbrl_v1_${randomString}`;
    const keyPrefix = `xbrl_v1_${randomString.substring(0, 4)}`;

    // APIキーをデータベースに直接挿入
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        name: name || 'API Key',
        key_prefix: keyPrefix,
        key_hash: apiKey, // 一時的にプレーンテキストで保存
        user_id: session.user.id, // 認証済みユーザーのID
        tier: 'free',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating API key:', error);
      return {
        success: false,
        error: 'APIキーの作成に失敗しました'
      }
    }

    // Return the plain text key only once for the user to save
    const newKey: ApiKey = {
      id: data.id,
      name: data.name,
      key: apiKey, // Return the actual key only this once
      created: new Date().toLocaleDateString('ja-JP'),
      lastUsed: '未使用',
      tier: (data.tier || 'free') as ApiKey['tier']
    }

    return {
      success: true,
      data: newKey
    }
  } catch (error) {
    console.error('Failed to create API key:', error)
    return { success: false, error: 'Failed to create API key' }
  }
}

export async function deleteApiKey(keyId: string) {
  const supabase = await supabaseManager.createSSRClient()

  const { data: { session }, error: authError } = await supabase.auth.getSession()
  if (authError || !session) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // 直接Edge Functionを呼び出す
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api-proxy/keys/${keyId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    })

    const result = await response.json()

    if (!response.ok || !result?.success) {
      return {
        success: false,
        error: result?.error || 'APIキーの削除に失敗しました'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to delete API key:', error)
    return { success: false, error: 'Failed to delete API key' }
  }
}