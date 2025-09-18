import { createBrowserClient } from '@supabase/ssr'

// グローバルスコープでシングルトンを管理
declare global {
  var __supabaseClient: ReturnType<typeof createBrowserClient> | undefined
}

/**
 * Create Supabase client with cookie-based session for client-side usage
 * Uses singleton pattern to avoid multiple instances
 */
export function createSupabaseClient() {
  // すでにグローバルインスタンスが存在する場合はそれを返す
  if (global.__supabaseClient) {
    return global.__supabaseClient
  }

  // 環境変数から取得（NEXT_PUBLIC_プレフィックスでクライアントサイドでも利用可能）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  // グローバルインスタンスを作成
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey)

  // 開発環境でのみグローバルに保存（本番環境でも同じ挙動にする）
  if (typeof window !== 'undefined') {
    global.__supabaseClient = client
  }

  return client
}

// サーバーサイド専用のSupabaseクライアント（SERVICE_ROLE_KEY使用）
export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  const { createClient } = require('@supabase/supabase-js')
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
