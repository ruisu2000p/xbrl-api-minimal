'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// 型定義
interface User {
  id: string;
  email: string;
  name?: string;
  company?: string;
  plan?: string;
  apiKey?: string;
  createdAt?: string;
}

interface ApiStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  remainingQuota: number;
  quotaLimit: number;
  lastRequestAt?: string | null;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'quickstart'>('overview');
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [fullApiKey, setFullApiKey] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchStats();
    fetchApiKeys();
    // LocalStorageから保存された完全なAPIキーを確認
    const savedApiKey = localStorage.getItem('currentApiKey');
    if (savedApiKey) {
      setFullApiKey(savedApiKey);
    }
  }, []);

  async function checkAuth() {
    // まずLocalStorageを確認
    const localUser = localStorage.getItem('user');
    if (localUser) {
      const userData = JSON.parse(localUser);
      setUser(userData);
      setLoading(false);
      return;
    }

    // LocalStorageにない場合はSupabase認証を確認
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      setUser(data.user);
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    }
  }

  async function fetchStats() {
    try {
      // APIから実際の使用状況を取得
      const response = await fetch('/api/v1/apikeys');
      if (response.ok) {
        const data = await response.json();
        // 統計情報から使用状況を設定
        if (data.stats) {
          setStats({
            totalRequests: data.stats.total_requests || 0,
            successfulRequests: data.stats.successful_requests || 0,
            failedRequests: data.stats.failed_requests || 0,
            remainingQuota: data.stats.remaining_quota || 1000,
            quotaLimit: data.stats.quota_limit || 1000,
            lastRequestAt: data.keys?.[0]?.last_used_at || null
          });
        } else {
          // 初期状態（まだAPIを使用していない）
          setStats({
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            remainingQuota: 1000,
            quotaLimit: 1000,
            lastRequestAt: null
          });
        }
      }
    } catch (error) {
      console.error('Stats fetch failed:', error);
      // エラー時は初期値を設定
      setStats({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        remainingQuota: 1000,
        quotaLimit: 1000,
        lastRequestAt: null
      });
    }
  }

  async function fetchApiKeys() {
    try {
      const response = await fetch('/api/v1/apikeys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.keys || []);
        // 最初のアクティブなAPIキーをユーザーオブジェクトに設定
        const activeKey = data.keys?.find((k: any) => k.is_active && k.status !== 'revoked');
        if (activeKey && user) {
          setUser({
            ...user,
            apiKey: `${activeKey.key_prefix}...${activeKey.key_suffix || ''}`
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  }

  const copyApiKey = () => {
    // 完全なAPIキーがある場合はそれをコピー、なければマスクされたキーをコピー
    const keyToCopy = fullApiKey || user?.apiKey;
    if (keyToCopy) {
      navigator.clipboard.writeText(keyToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getUsagePercentage = () => {
    if (!stats) return 0;
    return ((stats.quotaLimit - stats.remainingQuota) / stats.quotaLimit) * 100;
  };

  const getSuccessRate = () => {
    if (!stats || stats.totalRequests === 0) return 100;
    return (stats.successfulRequests / stats.totalRequests) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                <span className="hidden sm:inline">XBRL財務データAPI</span>
                <span className="sm:hidden">XBRL API</span>
              </h1>
              <span className="text-gray-400 hidden sm:inline">|</span>
              <span className="text-gray-600 font-medium text-sm sm:text-base">ダッシュボード</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Link 
                href="/docs" 
                className="hidden sm:block text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                ドキュメント
              </Link>
              <Link 
                href="/dashboard/apikeys" 
                className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <span className="hidden sm:inline">APIキー管理</span>
                <span className="sm:hidden">キー</span>
              </Link>
              <div className="relative group">
                <button className="flex items-center gap-1 sm:gap-2 text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm font-bold">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    プロフィール
                  </Link>
                  <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    設定
                  </Link>
                  <hr className="my-1" />
                  <button 
                    onClick={() => {
                      localStorage.removeItem('user');
                      router.push('/');
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    ログアウト
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ウェルカムセクション */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">
            こんにちは、{user.name || user.email.split('@')[0]}さん
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            {new Date().toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric', 
              weekday: 'long' 
            })}
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              {stats && stats.totalRequests > 0 && (
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full hidden sm:inline">
                  今月
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900">{stats?.totalRequests || 0}</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">API呼び出し</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-600 hidden sm:inline">
                {getSuccessRate().toFixed(1)}%
              </span>
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900">{stats?.successfulRequests || 0}</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">成功リクエスト</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full hidden sm:inline">
                4,231社
              </span>
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900">20年分</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">利用可能データ</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-600 hidden sm:inline">
                {user.plan === 'beta' ? 'ベータ' : user.plan}
              </span>
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900">{stats?.remainingQuota || 1000}</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">残りAPI</p>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              概要
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'usage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              使用状況
            </button>
            <button
              onClick={() => setActiveTab('quickstart')}
              className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'quickstart'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              クイックスタート
            </button>
          </nav>
        </div>

        {/* タブコンテンツ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {activeTab === 'overview' && (
            <>
              {/* APIキー情報 */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">APIキー情報</h3>
                
                {user.apiKey ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        あなたのAPIキー
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showApiKey ? "text" : "password"}
                          value={fullApiKey || user.apiKey || 'APIキーが設定されていません'}
                          readOnly
                          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                          disabled={!user.apiKey && !fullApiKey}
                        >
                          {showApiKey ? '隠す' : '表示'}
                        </button>
                        <button
                          onClick={copyApiKey}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          disabled={!user.apiKey && !fullApiKey}
                        >
                          {copied ? 'コピー済み' : 'コピー'}
                        </button>
                      </div>
                      {!fullApiKey && user.apiKey && (
                        <p className="text-xs text-orange-600 mt-2">
                          ⚠️ マスクされたキーのみ表示されています。完全なキーを取得するには、新しいAPIキーを作成してください。
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-600">作成日</p>
                        <p className="font-medium">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ja-JP') : '本日'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">有効期限</p>
                        <p className="font-medium">
                          {new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">環境</p>
                        <p className="font-medium">Production</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">ステータス</p>
                        <p className="font-medium text-green-600">アクティブ</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <p className="text-gray-600 mb-4">APIキーがまだ発行されていません</p>
                    <Link
                      href="/dashboard/apikeys"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      APIキーを発行する
                    </Link>
                  </div>
                )}
              </div>

            </>
          )}

          {activeTab === 'usage' && (
            <>
              {/* 使用状況グラフ */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">月間使用状況</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">API使用量</span>
                      <span className="font-medium">{stats?.totalRequests || 0} / {stats?.quotaLimit || 1000}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all"
                        style={{ width: `${getUsagePercentage()}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats?.totalRequests || 0}</p>
                      <p className="text-sm text-gray-600">総リクエスト</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{getSuccessRate().toFixed(1)}%</p>
                      <p className="text-sm text-gray-600">成功率</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats?.remainingQuota || 1000}</p>
                      <p className="text-sm text-gray-600">残り</p>
                    </div>
                  </div>

                  {/* 簡易グラフ */}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-3">過去7日間</p>
                    {stats?.totalRequests === 0 ? (
                      <div className="h-24 flex items-center justify-center text-gray-400 text-sm">
                        まだデータがありません
                      </div>
                    ) : (
                      <>
                        <div className="flex items-end justify-between h-24 gap-2">
                          {[0, 0, 0, 0, 0, 0, stats?.totalRequests || 0].map((value, i) => (
                            <div key={i} className="flex-1">
                              <div 
                                className="bg-gradient-to-t from-blue-500 to-indigo-400 rounded-t"
                                style={{ 
                                  height: value > 0 && stats ? `${Math.min((value / stats.quotaLimit) * 100, 100)}%` : '2px',
                                  minHeight: value > 0 ? '10px' : '2px'
                                }}
                              ></div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                          <span>月</span>
                          <span>火</span>
                          <span>水</span>
                          <span>木</span>
                          <span>金</span>
                          <span>土</span>
                          <span>今日</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 最近のアクティビティ */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">最近のアクティビティ</h3>
                {stats?.lastRequestAt ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">最終アクセス</p>
                        <p className="text-xs text-gray-500">
                          {new Date(stats.lastRequestAt).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    </div>
                    {stats.totalRequests > 0 && (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">成功したリクエスト</p>
                            <p className="text-xs text-gray-500">{stats.successfulRequests}回</p>
                          </div>
                        </div>
                        {stats.failedRequests > 0 && (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5"></div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">失敗したリクエスト</p>
                              <p className="text-xs text-gray-500">{stats.failedRequests}回</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">まだアクティビティがありません</p>
                    <p className="text-xs mt-1">APIを使用すると、ここに表示されます</p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'quickstart' && (
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">クイックスタートガイド</h3>
                
                <div className="grid gap-6 md:grid-cols-2">
                  {/* サンプルコード */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">1. 企業リストを取得</h4>
                    <div className="bg-gray-900 rounded-lg p-4 text-sm">
                      <pre className="text-green-400">
{`curl -H "X-API-Key: ${fullApiKey || user.apiKey || 'YOUR_API_KEY'}" \\
  https://api.xbrl.jp/v1/companies`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">2. 特定企業のデータ取得</h4>
                    <div className="bg-gray-900 rounded-lg p-4 text-sm">
                      <pre className="text-green-400">
{`curl -H "X-API-Key: ${fullApiKey || user.apiKey || 'YOUR_API_KEY'}" \\
  https://api.xbrl.jp/v1/companies/7203`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">3. 財務データ検索</h4>
                    <div className="bg-gray-900 rounded-lg p-4 text-sm">
                      <pre className="text-green-400">
{`curl -X POST -H "X-API-Key: ${fullApiKey || user.apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"year": 2022, "sector": "電気機器"}' \\
  https://api.xbrl.jp/v1/search`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">4. Python SDK</h4>
                    <div className="bg-gray-900 rounded-lg p-4 text-sm">
                      <pre className="text-green-400">
{`from xbrl_api import Client

client = Client("${fullApiKey || user.apiKey || 'YOUR_API_KEY'}")
companies = client.get_companies()
print(companies)`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-4">
                  <Link
                    href="/docs"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    完全なドキュメントを見る
                  </Link>
                  <Link
                    href="/examples"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    サンプルコード
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* お知らせセクション */}
        <div className="mt-6 sm:mt-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 sm:p-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-semibold mb-2">🎉 ベータ版をご利用いただきありがとうございます</h3>
              <p className="text-blue-100 text-sm sm:text-base">
                正式版リリース時には、ベータ参加者限定の特別価格でご利用いただけます。
                フィードバックをお待ちしております。
              </p>
            </div>
            <Link
              href="/feedback"
              className="bg-white text-blue-600 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              フィードバックを送る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}