import { createServerClient } from '@supabase/ssr'
import { createClient as createBrowserClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Unified Supabase Client Factory
 * すべてのSupabaseクライアント生成を一元管理
 *
 * 設計方針:
 * - 環境変数が不足している場合は起動時エラーとする
 * - nullを返さず、常にSupabaseClientを返す
 * - エラーは早期に検出して失敗させる
 */

// 環境変数の検証（起動時に実行）
function validateEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Required environment variables are missing: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  return { url, anonKey }
}

function validateServiceEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.XBRL_SUPABASE_SERVICE_KEY ||
                     process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  }

  // Service Keyは必須ではない（一部の環境では不要）
  return { url, serviceKey: serviceKey || null }
}

// グローバルインスタンスキャッシュ
let cachedServiceClient: SupabaseClient | null = null
let cachedAdminClient: SupabaseClient | null = null

/**
 * ブラウザクライアント作成
 * クライアントサイドで使用
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  const { url, anonKey } = validateEnvironment()

  // グローバルシングルトンを使用
  if (typeof window !== 'undefined') {
    const global = window as any
    if (!global.__supabaseClient) {
      // Use @supabase/ssr for browser client to properly sync cookies
      global.__supabaseClient = createServerClient(url, anonKey, {
        cookies: {
          get(name: string) {
            // Read cookies from document.cookie
            const cookies = document.cookie.split('; ')
            const cookie = cookies.find(c => c.startsWith(name + '='))
            return cookie?.split('=')[1]
          },
          set(name: string, value: string, options: any) {
            // Write cookies to document.cookie
            const cookieOptions = {
              ...options,
              path: options.path || '/',
              sameSite: options.sameSite || 'lax',
            }
            let cookieString = `${name}=${value}`
            if (cookieOptions.maxAge) {
              cookieString += `; max-age=${cookieOptions.maxAge}`
            }
            if (cookieOptions.path) {
              cookieString += `; path=${cookieOptions.path}`
            }
            if (cookieOptions.sameSite) {
              cookieString += `; samesite=${cookieOptions.sameSite}`
            }
            if (cookieOptions.secure) {
              cookieString += '; secure'
            }
            document.cookie = cookieString
          },
          remove(name: string, options: any) {
            // Remove cookie by setting expiration to the past
            const cookieOptions = {
              ...options,
              path: options.path || '/',
            }
            document.cookie = `${name}=; path=${cookieOptions.path}; max-age=0`
          },
        },
      })
    }
    return global.__supabaseClient
  }

  // SSRの場合はセッションを保持しないクライアントを返す
  return createBrowserClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * サーバークライアント作成（通常のanon key使用）
 * Server Components, Route Handlers, Server Actionsで使用
 *
 * @returns 必ずSupabaseClientを返す（nullを返さない）
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const { url, anonKey } = validateEnvironment()

  // Dynamically import next/headers to avoid build errors
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // Server Componentでの書き込みは無視
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // Server Componentでの書き込みは無視
        }
      },
    },
  })
}

/**
 * Service Roleクライアント作成（管理者権限）
 * バックエンド処理でのみ使用
 *
 * @returns 常にSupabaseClientを返す（環境変数がない場合はエラーをスロー）
 * @throws Error Service Keyが設定されていない場合
 */
export async function createServiceSupabaseClient(): Promise<SupabaseClient> {
  const { url, serviceKey } = validateServiceEnvironment()

  // Service Keyが設定されていない場合はエラーをスロー
  if (!serviceKey) {
    throw new Error(
      'Service role key is required but not configured. Set XBRL_SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable.'
    )
  }

  // シングルトンパターンで再利用
  if (!cachedServiceClient) {
    cachedServiceClient = createBrowserClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return cachedServiceClient
}

/**
 * 管理用の同期的なクライアント作成
 * Edge FunctionsやWorkerで使用
 *
 * @returns 常にSupabaseClientを返す（環境変数がない場合はエラーをスロー）
 * @throws Error Service Keyが設定されていない場合
 */
export function createAdminClient(): SupabaseClient {
  const { url, serviceKey } = validateServiceEnvironment()

  if (!serviceKey) {
    throw new Error(
      'Service role key is required but not configured. Set XBRL_SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable.'
    )
  }

  // シングルトンパターンで再利用
  if (!cachedAdminClient) {
    cachedAdminClient = createBrowserClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return cachedAdminClient
}

/**
 * 後方互換性のためのエイリアス
 */
export const createClient = createServerSupabaseClient
export const createServiceClient = createServiceSupabaseClient
export const createServiceRoleClient = createAdminClient