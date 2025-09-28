/**
 * Legacy server client wrapper
 * 新しい統一クライアントへの移行用ラッパー
 *
 * @deprecated unified-client.ts を直接使用してください
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from './unified-client'

/**
 * @deprecated createServerSupabaseClient を使用してください
 */
export async function createClient(): Promise<SupabaseClient> {
  return createServerSupabaseClient()
}

/**
 * @deprecated createServiceSupabaseClient を使用してください
 *
 * Service Keyが設定されていない場合は通常のクライアントを返す
 */
export async function createServiceClient(): Promise<SupabaseClient> {
  const serviceClient = await createServiceSupabaseClient()

  // Service Keyが設定されていない場合は通常のクライアントを返す
  if (!serviceClient) {
    console.warn('Service role key not configured, falling back to regular client')
    return createServerSupabaseClient()
  }

  return serviceClient
}