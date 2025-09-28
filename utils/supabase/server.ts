import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Componentでの書き込みは無視（middlewareで処理）
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
    }
  )
}

// Service Role用のクライアント（管理者操作用）
export async function createServiceClient(): Promise<SupabaseClient> {
  const serviceKey = process.env.XBRL_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error('Service role key not configured')
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Service Roleではcookie操作は不要
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Service Roleではcookie操作は不要
          }
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  ) as SupabaseClient
}