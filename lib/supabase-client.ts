import { supabaseManager } from '@/lib/infrastructure/supabase-manager';

// 既存のsupabaseManagerを使用してクライアントを取得
export function getSupabaseClient() {
  // ブラウザ環境ではgetBrowserClientを使用
  if (typeof window !== 'undefined') {
    return supabaseManager.getBrowserClient();
  }

  // サーバー環境ではgetAnonClientを使用
  return supabaseManager.getAnonClient();
}