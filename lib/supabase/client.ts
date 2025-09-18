import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | undefined

function requireEnv(key: string): string {
  const value = process.env[key]

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }

  return value
}

/**
 * Create Supabase client with cookie-based session for client-side usage.
 * Uses a module-level singleton to avoid creating multiple instances.
 */
export function createSupabaseClient() {
  if (browserClient) {
    return browserClient
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return browserClient
}
