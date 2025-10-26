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
} from '@/lib/security/bcrypt-apikey'
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
}): Promise<{ success: boolean; user?: any; apiKey?: string | null; error?: string }> {
  try {
    console.log('🔵 [SERVER] signUp called with:', {
      email: userData.email,
      name: userData.name,
      plan: userData.plan,
      billingPeriod: userData.billingPeriod,
      hasCompany: !!userData.company
    });
  } catch (logError) {
    // Even logging can fail, so wrap it
    console.error('Failed to log signup start:', logError);
  }

  try {
    // Input validation
    console.log('🔵 [SERVER] Starting input validation...');
    const validatedEmail = emailSchema.parse(userData.email)
    const validatedPassword = passwordSchema.parse(userData.password)
    const validatedName = sanitizeInput(userData.name)
    const validatedCompany = userData.company ? sanitizeInput(userData.company) : null

    console.log('🔵 [SERVER] Input validation passed');
    console.log('🔵 [SERVER] Creating SSR client...');

    const supabase = await supabaseManager.createSSRClient()

    console.log('🔵 [SERVER] Calling supabase.auth.signUp...');

    // Create user account
    const { data, error } = await supabase.auth.signUp({
      email: validatedEmail,
      password: validatedPassword,
      options: {
        data: {
          name: validatedName,
          company: validatedCompany,
          plan: userData.plan,
          billing_period: userData.billingPeriod
        }
      }
    })

    console.log('🔵 [SERVER] supabase.auth.signUp response:', {
      hasData: !!data,
      hasUser: !!data?.user,
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message
    });

    if (error) {
      console.error('User signup error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error
      })

      // Provide more specific error messages
      if (error.code === 'user_already_exists' || error.message?.includes('Database error saving new user')) {
        return {
          success: false,
          error: 'このメールアドレスは既に登録されています'
        }
      }

      // Check for weak password with more detail
      if (error.code === 'weak_password' || error.message?.toLowerCase().includes('password')) {
        console.error('Password validation failed:', {
          providedPassword: validatedPassword.replace(/./g, '*'),
          passwordLength: validatedPassword.length,
          hasUpperCase: /[A-Z]/.test(validatedPassword),
          hasLowerCase: /[a-z]/.test(validatedPassword),
          hasNumber: /[0-9]/.test(validatedPassword),
          errorMessage: error.message
        })

        // Return the actual error message from Supabase for debugging
        return {
          success: false,
          error: `パスワードエラー: ${error.message || 'パスワードが要件を満たしていません'}`
        }
      }

      if (error.code === 'invalid_email') {
        return {
          success: false,
          error: '有効なメールアドレスを入力してください'
        }
      }

      if (error.message?.includes('Email signups are disabled')) {
        return {
          success: false,
          error: 'サインアップが一時的に無効になっています。管理者にお問い合わせください'
        }
      }

      return {
        success: false,
        error: sanitizeError(error)
      }
    }

    if (data?.user) {
      // Create API key for the new user
      let fullApiKey: string | null = null

      try {
        const admin = await supabaseManager.createAdminSSRClient()

        if (admin) {
          const tier = userData.plan === 'freemium' ? 'free'
            : userData.plan === 'standard' ? 'basic'  // standardをbasicにマッピング
            : 'basic'

          // Use the create_api_key_bcrypt function for new user registration
          const { data: result, error: createError } = await admin
            .rpc('create_api_key_bcrypt', {
            p_user_id: data.user.id,
            p_name: 'Default API Key',
            p_description: 'Default API key for new user',
            p_tier: tier
            })

          if (createError) {
            console.error('API Key creation error:', {
              message: createError.message,
              code: createError.code,
              details: createError,
              hint: createError.hint
            })
            throw new Error(`API Key creation failed: ${createError.message}`)
          }

          if (!result || typeof result !== 'object') {
            console.error('API Key creation failed:', result)
            throw new Error('APIキーの作成に失敗しました')
          }

          // create_api_key_bcrypt関数のレスポンス形式に合わせて調整
          fullApiKey = result.api_key || result.full_key || null
        } else {
          console.error('Admin client not available')
        }

        console.log('API Key created successfully:', {
          has_api_key: !!fullApiKey
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
          name: validatedName,
          company: validatedCompany,
          plan: userData.plan
        },
        apiKey: fullApiKey // Return the API key once for the user to save
      }
    }

    return {
      success: false,
      error: 'Account creation failed'
    }
  } catch (error) {
    console.error('🔴 [SERVER] Error during signup:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Return detailed error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage.includes('Invalid') || errorMessage.includes('Validation')
        ? errorMessage
        : `アカウント作成中にエラーが発生しました: ${errorMessage}`
    }
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

    // APIキーを生成（32文字のセキュアなランダム文字列）
    const { generateSecureToken } = await import('@/lib/security/validation')
    const randomString = generateSecureToken(32) // 32バイト = 64文字の16進数
    const apiKey = `xbrl_v1_${randomString}`;

    // 既存のcreate_api_key関数を使用（この関数内でbcryptハッシュ化される）
    const { data, error } = await supabase
      .rpc('create_api_key', {
        p_user_id: session.user.id,
        p_name: name || 'API Key',
        p_environment: 'production'
      });

    if (error) {
      console.error('Error creating API key:', error);
      return {
        success: false,
        error: 'APIキーの作成に失敗しました'
      }
    }

    // create_api_key関数はAPIキーそのものを返すので、それを使用
    // dataにはAPIキー文字列が返される
    const actualApiKey = data as unknown as string;

    // Return the plain text key only once for the user to save
    const newKey: ApiKey = {
      id: crypto.randomUUID(), // 一時的なID
      name: name || 'API Key',
      key: actualApiKey, // Return the actual key only this once
      created: new Date().toLocaleDateString('ja-JP'),
      lastUsed: '未使用',
      tier: 'free' as ApiKey['tier']
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

  // セキュリティ検証ライブラリを使用
  const { validateApiKeyFormat, buildSecureUrl } = await import('@/lib/security/validation')

  // APIキーフォーマットの検証（SSRF対策）
  if (!validateApiKeyFormat(keyId)) {
    return {
      success: false,
      error: 'Invalid API key format'
    }
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!baseUrl) {
      return { success: false, error: 'Invalid configuration' }
    }

    // 安全なURL構築
    const url = buildSecureUrl(
      baseUrl,
      `/functions/v1/api-proxy/keys/${encodeURIComponent(keyId)}`
    )

    // 直接Edge Functionを呼び出す（セキュアURL使用）
    const response = await fetch(url, {
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