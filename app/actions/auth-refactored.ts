/**
 * Refactored Authentication Actions
 * 認証関連のアクションをリファクタリングしたバージョン
 *
 * 改善点:
 * - 関数の分割による責任の明確化
 * - エラーハンドリングの統一
 * - 定数の外部化
 * - 早期リターンによるネストの削減
 */

'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/utils/supabase/unified-client'
import { UnifiedApiKeyManager } from '@/lib/api-key/unified-api-key-manager'
import {
  emailSchema,
  passwordSchema,
  apiKeyNameSchema,
  sanitizeInput,
  sanitizeError,
} from '@/lib/security/input-validation'
import type { SupabaseClient, AuthError } from '@supabase/supabase-js'

// 定数定義
const RATE_LIMIT_CONFIG = {
  SIGNIN_ATTEMPTS: 5,
  SIGNIN_WINDOW_MS: 300000, // 5分
  SIGNUP_ATTEMPTS: 3,
  SIGNUP_WINDOW_MS: 600000, // 10分
  API_KEY_ATTEMPTS: 10,
  API_KEY_WINDOW_MS: 3600000, // 1時間
} as const

const ERROR_MESSAGES = {
  TOO_MANY_ATTEMPTS: '試行回数が多すぎます。後でもう一度お試しください。',
  LOGIN_FAILED: 'ログインに失敗しました',
  SIGNUP_FAILED: '登録に失敗しました',
  USER_EXISTS: 'このメールアドレスは既に使用されています',
  INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません',
  API_KEY_GENERATION_FAILED: 'APIキーの生成に失敗しました',
  VALIDATION_ERROR: '入力値が無効です',
} as const

// 型定義
interface AuthResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

interface UserData {
  id: string
  email: string
  name?: string
  company?: string
  plan?: string
  apiKey?: string | null
}

// レート制限のシンプルな実装（実際にはRedisなどを使用すべき）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * レート制限チェック
 */
function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const limit = rateLimitStore.get(key)

  if (!limit || limit.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }

  if (limit.count >= maxAttempts) {
    return false
  }

  limit.count++
  return true
}

/**
 * クライアントIPアドレス取得
 */
async function getClientIp(): Promise<string> {
  const headersList = await headers()
  return headersList.get('x-forwarded-for') ||
         headersList.get('x-real-ip') ||
         'unknown'
}

/**
 * Supabaseエラーメッセージの日本語化
 */
function translateAuthError(error: AuthError): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': ERROR_MESSAGES.INVALID_CREDENTIALS,
    'User already registered': ERROR_MESSAGES.USER_EXISTS,
    'Email not confirmed': 'メールアドレスの確認が必要です',
    'Password should be at least 6 characters': 'パスワードは6文字以上にしてください',
  }

  return errorMap[error.message] || error.message
}

/**
 * ユーザーデータの整形
 */
function formatUserData(user: any, apiKey?: string | null): UserData {
  return {
    id: user.id,
    email: user.email!,
    name: sanitizeInput(user.user_metadata?.name || ''),
    company: sanitizeInput(user.user_metadata?.company || ''),
    plan: user.user_metadata?.plan || 'beta',
    apiKey,
  }
}

/**
 * APIキー取得
 */
async function fetchUserApiKey(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('api_keys_main')
      .select('key_prefix')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .single()

    return data?.key_prefix ? `xbrl_${data.key_prefix}_***` : null
  } catch {
    return null
  }
}

/**
 * サインイン処理
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult<UserData>> {
  try {
    // 入力値検証
    const validatedEmail = emailSchema.parse(email)
    const validatedPassword = passwordSchema.parse(password)

    // レート制限チェック
    const clientIp = await getClientIp()
    const rateLimitKey = `signin:${clientIp}`

    if (!checkRateLimit(
      rateLimitKey,
      RATE_LIMIT_CONFIG.SIGNIN_ATTEMPTS,
      RATE_LIMIT_CONFIG.SIGNIN_WINDOW_MS
    )) {
      return {
        success: false,
        error: ERROR_MESSAGES.TOO_MANY_ATTEMPTS,
      }
    }

    // Supabaseクライアント作成
    const supabase = await createServerSupabaseClient()

    // サインイン実行
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedEmail,
      password: validatedPassword,
    })

    if (error) {
      return {
        success: false,
        error: translateAuthError(error),
      }
    }

    if (!data?.user) {
      return {
        success: false,
        error: ERROR_MESSAGES.LOGIN_FAILED,
      }
    }

    // APIキー取得
    const apiKey = await fetchUserApiKey(supabase, data.user.id)

    // キャッシュ再検証
    revalidatePath('/dashboard', 'layout')

    return {
      success: true,
      data: formatUserData(data.user, apiKey),
    }
  } catch (error) {
    console.error('Sign in error:', error)
    return {
      success: false,
      error: sanitizeError(error),
    }
  }
}

/**
 * サインアップ処理
 */
export async function signUp(
  email: string,
  password: string,
  metadata?: {
    name?: string
    company?: string
  }
): Promise<AuthResult<UserData>> {
  try {
    // 入力値検証
    const validatedEmail = emailSchema.parse(email)
    const validatedPassword = passwordSchema.parse(password)

    // レート制限チェック
    const clientIp = await getClientIp()
    const rateLimitKey = `signup:${clientIp}`

    if (!checkRateLimit(
      rateLimitKey,
      RATE_LIMIT_CONFIG.SIGNUP_ATTEMPTS,
      RATE_LIMIT_CONFIG.SIGNUP_WINDOW_MS
    )) {
      return {
        success: false,
        error: ERROR_MESSAGES.TOO_MANY_ATTEMPTS,
      }
    }

    // Supabaseクライアント作成
    const supabase = await createServerSupabaseClient()

    // サインアップ実行
    const { data, error } = await supabase.auth.signUp({
      email: validatedEmail,
      password: validatedPassword,
      options: {
        data: {
          name: sanitizeInput(metadata?.name || ''),
          company: sanitizeInput(metadata?.company || ''),
          plan: 'beta',
        },
      },
    })

    if (error) {
      return {
        success: false,
        error: translateAuthError(error),
      }
    }

    if (!data?.user) {
      return {
        success: false,
        error: ERROR_MESSAGES.SIGNUP_FAILED,
      }
    }

    // APIキー自動生成
    const apiKeyManager = new UnifiedApiKeyManager(supabase)
    const keyResult = await apiKeyManager.generateApiKey(
      data.user.id,
      'Default API Key',
      365 // 1年間有効
    )

    return {
      success: true,
      data: formatUserData(data.user, keyResult.apiKey),
    }
  } catch (error) {
    console.error('Sign up error:', error)
    return {
      success: false,
      error: sanitizeError(error),
    }
  }
}

/**
 * サインアウト処理
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    // キャッシュクリア
    revalidatePath('/', 'layout')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Sign out error:', error)
    return {
      success: false,
      error: sanitizeError(error),
    }
  }
}

/**
 * APIキー生成
 */
export async function generateApiKey(
  name: string
): Promise<AuthResult<{ apiKey: string; keyId: string }>> {
  try {
    // 入力値検証
    const validatedName = apiKeyNameSchema.parse(name)

    // レート制限チェック
    const clientIp = await getClientIp()
    const rateLimitKey = `apikey:${clientIp}`

    if (!checkRateLimit(
      rateLimitKey,
      RATE_LIMIT_CONFIG.API_KEY_ATTEMPTS,
      RATE_LIMIT_CONFIG.API_KEY_WINDOW_MS
    )) {
      return {
        success: false,
        error: ERROR_MESSAGES.TOO_MANY_ATTEMPTS,
      }
    }

    // 認証チェック
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: '認証が必要です',
      }
    }

    // APIキー生成
    const apiKeyManager = new UnifiedApiKeyManager(supabase)
    const result = await apiKeyManager.generateApiKey(
      user.id,
      validatedName,
      365 // 1年間有効
    )

    if (!result.success) {
      return {
        success: false,
        error: result.error || ERROR_MESSAGES.API_KEY_GENERATION_FAILED,
      }
    }

    return {
      success: true,
      data: {
        apiKey: result.apiKey!,
        keyId: result.keyId!,
      },
    }
  } catch (error) {
    console.error('API key generation error:', error)
    return {
      success: false,
      error: sanitizeError(error),
    }
  }
}

/**
 * APIキー無効化
 */
export async function revokeApiKey(keyId: string): Promise<AuthResult> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: '認証が必要です',
      }
    }

    const apiKeyManager = new UnifiedApiKeyManager(supabase)
    const success = await apiKeyManager.revokeApiKey(keyId, user.id)

    return {
      success,
      error: success ? undefined : 'APIキーの無効化に失敗しました',
    }
  } catch (error) {
    console.error('API key revocation error:', error)
    return {
      success: false,
      error: sanitizeError(error),
    }
  }
}

/**
 * パスワードリセット要求
 */
export async function requestPasswordReset(
  email: string
): Promise<AuthResult> {
  try {
    const validatedEmail = emailSchema.parse(email)
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase.auth.resetPasswordForEmail(
      validatedEmail,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      }
    )

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Password reset error:', error)
    return {
      success: false,
      error: sanitizeError(error),
    }
  }
}