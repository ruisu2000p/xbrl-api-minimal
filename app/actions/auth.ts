'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { maskApiKey } from '@/lib/security/apiKey'
import { UnifiedAuthManager } from '@/lib/security/auth-manager'
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
    let tempApiKey: string | null = null
    try {
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      const planTier = userData.plan === 'freemium'
        ? 'free'
        : userData.plan === 'standard'
          ? 'pro'
          : 'basic'

      const rateLimits = {
        perMinute: 100,
        perHour: 2000,
        perDay: userData.plan === 'freemium' ? 10000 : 50000
      }

      const { apiKey } = await UnifiedAuthManager.createApiKey(
        data.user.id,
        'Default API Key',
        {
          tier: planTier,
          status: 'active',
          expiresAt,
          metadata: {
            created_via: 'signup',
            user_email: userData.email,
            plan: userData.plan,
            created_at: new Date().toISOString()
          },
          rateLimits,
          extraFields: {
            environment: 'production',
            permissions: {
              endpoints: ['*'],
              scopes: ['read:markdown', 'read:companies', 'read:documents'],
              rate_limit: userData.plan === 'freemium'
                ? 1000
                : userData.plan === 'standard'
                  ? 10000
                  : 5000
            },
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            created_by: data.user.id
          }
        }
      )

      tempApiKey = apiKey
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
        plan: userData.plan,
        apiKey: tempApiKey
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

export async function getUserApiKeys(): Promise<ApiKeyResponse> {
  const supabase = await createSupabaseServerClient()

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
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const { apiKey, record } = await UnifiedAuthManager.createApiKey(
      user.id,
      name || 'API Key',
      {
        tier: 'basic',
        status: 'active',
        metadata: {
          created_via: 'user_dashboard',
          created_at: new Date().toISOString()
        },
        rateLimits: {
          perMinute: 100,
          perHour: 2000,
          perDay: 50000
        },
        extraFields: {
          created_by: user.id
        }
      }
    )

    const newKey: ApiKey = {
      id: record.id,
      name: record.name ?? name,
      key: apiKey, // Return the actual key only this once
      created: record.created_at
        ? new Date(record.created_at).toLocaleDateString('ja-JP')
        : new Date().toLocaleDateString('ja-JP'),
      lastUsed: '未使用',
      tier: (record.tier as ApiKey['tier']) ?? 'basic'
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