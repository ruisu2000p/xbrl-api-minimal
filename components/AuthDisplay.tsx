'use client';

import { useState, useEffect } from 'react';
import { type AuthChangeEvent, type Session } from '@supabase/supabase-js';
import { useSupabase } from '@/components/SupabaseProvider';

interface AuthDisplayProps {
  className?: string;
}

export default function AuthDisplay({ className = '' }: AuthDisplayProps) {
  const { supabase, user: contextUser, loading: contextLoading } = useSupabase();
  const [user, setUser] = useState<any>(null);
  const [jwt, setJwt] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showJwt, setShowJwt] = useState(false);

  useEffect(() => {
    // 認証状態を監視
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          setJwt(session.access_token || '');
        }
        setLoading(false);
      } catch (error) {
        console.error('Auth error:', error);
        setLoading(false);
      }
    };

    getSession();

    // 認証状態変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          setUser(session.user);
          setJwt(session.access_token || '');
        } else {
          setUser(null);
          setJwt('');
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  // ログイン処理
  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github'
      });
      if (error) console.error('Login error:', error);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Logout error:', error);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // JWT をクリップボードにコピー
  const copyJwtToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jwt);
      alert('JWT をクリップボードにコピーしました！');
    } catch (error) {
      console.error('Copy failed:', error);
      alert('コピーに失敗しました');
    }
  };

  // JWT の先頭と末尾を表示
  const formatJwtDisplay = (token: string) => {
    if (!token) return '';
    if (token.length <= 20) return token;
    return `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">認証状態を確認中...</span>
      </div>
    );
  }


  if (!user) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <span className="text-sm text-gray-600">未認証</span>
        <button
          onClick={handleLogin}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          GitHubでログイン
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ユーザー情報 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <i className="ri-user-line text-green-600"></i>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {user.email || user.user_metadata?.name || 'ユーザー'}
            </div>
            <div className="text-xs text-gray-500">認証済み</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-red-600 transition-colors"
        >
          ログアウト
        </button>
      </div>

      {/* JWT表示セクション */}
      {jwt && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">JWT Token</h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowJwt(!showJwt)}
                className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
              >
                {showJwt ? '隠す' : '表示'}
              </button>
              <button
                onClick={copyJwtToClipboard}
                className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
              >
                コピー
              </button>
            </div>
          </div>

          <div className="bg-white rounded border p-3">
            {showJwt ? (
              <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all font-mono">
                {jwt}
              </pre>
            ) : (
              <div className="text-xs text-gray-500 font-mono">
                {formatJwtDisplay(jwt)}
              </div>
            )}
          </div>

          <div className="mt-2 text-xs text-gray-500">
            <p>このJWTトークンを使用してXBRL APIにアクセスできます。</p>
            <p className="mt-1">
              <code className="bg-gray-200 px-1 rounded text-xs">
                Authorization: Bearer {formatJwtDisplay(jwt)}
              </code>
            </p>
          </div>
        </div>
      )}

    </div>
  );
}