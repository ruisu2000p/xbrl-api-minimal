import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

/**
 * Unified Supabase Manager
 * 一元管理されたSupabaseクライアント
 */
export class SupabaseManager {
  private static instance: SupabaseManager;
  private anonClient: SupabaseClient | null = null;
  private browserClient: SupabaseClient | null = null;
  private serviceClient: SupabaseClient | null = null;

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
   * 環境変数のチェック
   */
  private checkEnvironmentVariables() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('Supabase環境変数が設定されていません: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    return { url, anonKey };
  }

  /**
   * Service Role環境変数のチェック
   */
  private checkServiceEnvironmentVariables() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // 連携に影響されない独自の環境変数名を使用
    const serviceKey = process.env.XBRL_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      throw new Error('Supabase Service環境変数が設定されていません: NEXT_PUBLIC_SUPABASE_URL, XBRL_SUPABASE_SERVICE_KEY');
    }

    return { url, serviceKey };
  }

  /**
   * Anonクライアント取得（クライアント側で使用）
   */
  getAnonClient(): SupabaseClient {
    if (!this.anonClient) {
      const { url, anonKey } = this.checkEnvironmentVariables();

      this.anonClient = createClient(url, anonKey, {
        auth: {
          persistSession: true,  // セッションを保持するように変更
          autoRefreshToken: true,  // トークンの自動更新を有効化
          detectSessionInUrl: true  // URLからセッション検出を有効化
        },
        global: {
          headers: {
            'X-Client-Info': 'xbrl-api-minimal/4.0',
          },
        },
      });
    }

    return this.anonClient;
  }

  /**
   * ブラウザ用クライアント取得（認証セッション保持）
   */
  getBrowserClient(): SupabaseClient {
    // ブラウザ環境でのみシングルトンで管理
    if (typeof window !== 'undefined') {
      // windowグローバルを使用してシングルトンを保証
      // @ts-ignore
      if (!window.__xbrlSupabaseClient) {
        const { url, anonKey } = this.checkEnvironmentVariables();

        // @ts-ignore
        window.__xbrlSupabaseClient = createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            storage: window.localStorage,
            storageKey: `sb-${url.match(/https:\/\/([^.]+)/)?.[1]}-auth-token`,
            cookieOptions: {
              name: `sb-${url.match(/https:\/\/([^.]+)/)?.[1]}-auth-token`,
              sameSite: 'lax',
              secure: true
            }
          },
          global: {
            headers: {
              'X-Client-Info': 'xbrl-api-minimal-browser/4.0',
            },
          },
        });
      }
      // @ts-ignore
      return window.__xbrlSupabaseClient;
    }

    // サーバーサイドでは毎回新しいクライアントを作成
    const { url, anonKey } = this.checkEnvironmentVariables();
    return createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'xbrl-api-minimal-browser-ssr/4.0',
        },
      },
    });
  }

  /**
   * Service Roleクライアント取得（サーバー側のみ）
   */
  getServiceClient(): SupabaseClient {
    if (!this.serviceClient) {
      const { url, serviceKey } = this.checkServiceEnvironmentVariables();

      this.serviceClient = createClient(url, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            'X-Client-Info': 'xbrl-api-minimal-service/4.0',
          },
        },
      });
    }

    return this.serviceClient;
  }

  /**
   * SSRクライアント作成（Next.js App Router用）
   */
  async createSSRClient() {
    const { url, anonKey } = this.checkEnvironmentVariables();
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    return createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Componentからの呼び出しは無視
          }
        },
      },
      auth: {
        autoRefreshToken: true,  // サーバー側でもトークン自動更新を有効化
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  /**
   * サーバークライアント作成（Cookieストアを受け取る）
   */
  getServerClient(cookieStore: any) {
    const { url, anonKey } = this.checkEnvironmentVariables();

    return createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any) {
          try {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Componentからの呼び出しは無視
          }
        },
      },
    });
  }

  /**
   * 管理用SSRクライアント作成（Service Role Key使用）
   */
  async createAdminSSRClient() {
    const { url, serviceKey } = this.checkServiceEnvironmentVariables();
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    return createServerClient(url, serviceKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Componentからの呼び出しは無視
          }
        },
      },
      auth: { persistSession: false },
    });
  }

  /**
   * 一時的な管理用クライアント作成（トークン検証用）
   */
  createTemporaryAdminClient(): SupabaseClient {
    const { url, serviceKey } = this.checkServiceEnvironmentVariables();

    return createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  }
}

// エクスポート
export const supabaseManager = SupabaseManager.getInstance();