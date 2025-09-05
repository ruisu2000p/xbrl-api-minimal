/**
 * Supabase Auth ヘルパー
 * ユーザー認証状態の取得
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * 認証済みユーザーのIDを取得
 * @returns ユーザーID または null
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {
            // Server Component では set できない
          },
          remove() {
            // Server Component では remove できない
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * 認証済みユーザー情報を取得
 */
export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * 認証チェック（認証されていない場合はエラーレスポンスを返す）
 */
export async function requireAuth() {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return {
      error: 'Unauthorized. Please login first.',
      status: 401,
    };
  }
  
  return { userId };
}