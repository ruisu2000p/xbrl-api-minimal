import { SupabaseClient } from '@supabase/supabase-js';
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServiceRoleClient
} from '@/utils/supabase/unified-client';

/**
 * Unified Supabase Manager - Wrapper for unified client
 * 統一されたSupabaseクライアントのラッパー
 */
export class SupabaseManager {
  private static instance: SupabaseManager;

  private constructor() {}

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(): SupabaseManager {
    if (!SupabaseManager.instance) {
      SupabaseManager.instance = new SupabaseManager();
    }
    return SupabaseManager.instance;
  }

  /**
   * Anonクライアント取得（クライアント側で使用）
   * 統一クライアントのブラウザクライアントを使用
   */
  getAnonClient(): SupabaseClient {
    return createBrowserSupabaseClient();
  }

  /**
   * ブラウザ用クライアント取得（認証セッション保持）
   */
  getBrowserClient(): SupabaseClient {
    return createBrowserSupabaseClient();
  }

  /**
   * Service Roleクライアント取得（サーバー側のみ）
   * 常にSupabaseClientを返す（nullの場合は例外をスロー）
   */
  getServiceClient(): SupabaseClient {
    const client = createServiceRoleClient();
    if (!client) {
      throw new Error('Service role client not available. Check SUPABASE_SERVICE_ROLE_KEY environment variable.');
    }
    return client;
  }

  /**
   * SSRクライアント作成（Next.js App Router用）
   */
  async createSSRClient() {
    return createServerSupabaseClient();
  }

  /**
   * サーバークライアント作成
   */
  async getServerClient(cookieStore?: any) {
    // 統一クライアントは内部でcookieStoreを管理
    return createServerSupabaseClient();
  }

  /**
   * 管理用SSRクライアント作成（Service Role Key使用）
   */
  async createAdminSSRClient() {
    return createServiceRoleClient();
  }

  /**
   * 一時的な管理用クライアント作成（トークン検証用）
   * 常にSupabaseClientを返す（nullの場合は例外をスロー）
   */
  createTemporaryAdminClient(): SupabaseClient {
    const client = createServiceRoleClient();
    if (!client) {
      throw new Error('Admin client not available. Check SUPABASE_SERVICE_ROLE_KEY environment variable.');
    }
    return client;
  }
}

// エクスポート
export const supabaseManager = SupabaseManager.getInstance();