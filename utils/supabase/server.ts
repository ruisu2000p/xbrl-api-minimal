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
 * 常にSupabaseClientを返す（環境変数がない場合はエラーをスロー）
 */
export async function createServiceClient(): Promise<SupabaseClient> {
  return createServiceSupabaseClient()
}