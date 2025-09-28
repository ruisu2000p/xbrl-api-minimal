import { createBrowserSupabaseClient } from './unified-client'

/**
 * Legacy client creation function
 * 統一クライアントのラッパーとして機能
 */
export function createClient() {
  return createBrowserSupabaseClient()
}