import { createBrowserClient } from '@supabase/ssr'

// シングルトンインスタンスを保持
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

/**
 * Create Supabase client with cookie-based session for client-side usage
 * Uses singleton pattern to avoid multiple instances
 */
export function createSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  // 環境変数から取得（NEXT_PUBLIC_プレフィックスでクライアントサイドでも利用可能）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return supabaseClient
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
