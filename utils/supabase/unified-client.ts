import { createServerClient } from '@supabase/ssr'
import { createClient as createBrowserClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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
      global.__supabaseClient = createBrowserClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          storage: window.localStorage,
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
 * @returns Service Keyが設定されていない場合はnullを返す
 */
export async function createServiceSupabaseClient(): Promise<SupabaseClient | null> {
  const { url, serviceKey } = validateServiceEnvironment()

  // Service Keyが設定されていない場合はnullを返す
  if (!serviceKey) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient(url, serviceKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        // Service Roleではcookie操作は不要
      },
      remove(name: string, options: any) {
        // Service Roleではcookie操作は不要
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * 管理用の同期的なクライアント作成
 * Edge FunctionsやWorkerで使用
 */
export function createAdminClient(): SupabaseClient | null {
  const { url, serviceKey } = validateServiceEnvironment()

  if (!serviceKey) {
    return null
  }

  return createBrowserClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * 後方互換性のためのエイリアス
 */
export const createClient = createServerSupabaseClient
export const createServiceClient = createServiceSupabaseClient