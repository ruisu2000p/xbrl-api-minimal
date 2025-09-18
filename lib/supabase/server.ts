import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type AuthOptions = {
  persistSession?: boolean
  autoRefreshToken?: boolean
}

function requireEnv(key: string): string {
  const value = process.env[key]

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }

  return value
}

async function createSupabaseClientWithKey(key: string, authOptions?: AuthOptions) {
  const cookieStore = cookies()
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')

  const auth = authOptions
    ? {
        persistSession: authOptions.persistSession ?? true,
        autoRefreshToken: authOptions.autoRefreshToken ?? true,
      }
    : undefined

  return createServerClient(supabaseUrl, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Component から呼び出された場合、Cookie API は読み取り専用
        }
      },
    },
    ...(auth ? { auth } : {}),
  })
}

export async function createSupabaseServerClient() {
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createSupabaseClientWithKey(anonKey)
}

export async function createSupabaseServerAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be set')
  }

  return createSupabaseClientWithKey(serviceKey, {
    persistSession: false,
    autoRefreshToken: false,
  })
}