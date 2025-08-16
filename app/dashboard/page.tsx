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

interface RecentActivity {
  id: string;
  endpoint: string;
  method: string;
  status: number;
  timestamp: string;
  responseTime: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'quickstart' | 'activity'>('overview');
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [fullApiKey, setFullApiKey] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchStats();
    fetchApiKeys();
    fetchRecentActivities();
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
      localStorage.setItem('user', JSON.stringify(data.user));
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    }
  }

  async function fetchStats() {
    try {
      // デモデータを使用（本番環境では実際のAPIを呼び出す）
      setStats({
        totalRequests: 342,
        successfulRequests: 338,
        failedRequests: 4,
        remainingQuota: 658,
        quotaLimit: 1000,
        lastRequestAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      console.error('Stats fetch failed:', error);
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
      // デモAPIキーを設定
      const demoKey = 'xbrl_test_a1b2c3d4e5f6g7h8i9j0';
      setFullApiKey(demoKey);
      if (user) {
        setUser({
          ...user,
          apiKey: `${demoKey.substring(0, 10)}...${demoKey.substring(demoKey.length - 4)}`
        });
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  }

  async function fetchRecentActivities() {
    // デモデータ
    const activities: RecentActivity[] = [
      {
        id: '1',
        endpoint: '/api/v1/companies',
        method: 'GET',
        status: 200,
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        responseTime: 145
      },
      {
        id: '2',
        endpoint: '/api/v1/companies/7203',
        method: 'GET',
        status: 200,
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        responseTime: 98
      },
      {
        id: '3',
        endpoint: '/api/v1/financial-data',
        method: 'POST',
        status: 200,
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        responseTime: 523
      },
      {
        id: '4',
        endpoint: '/api/v1/companies/9999',
        method: 'GET',
        status: 404,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        responseTime: 67
      }
    ];
    setRecentActivities(activities);
  }

  async function generateNewApiKey() {
    setIsGeneratingKey(true);
    try {
      // デモ: 新しいAPIキーを生成
      await new Promise(resolve => setTimeout(resolve, 1500));
      const newKey = `xbrl_live_${Math.random().toString(36).substring(2, 15)}`;
      setFullApiKey(newKey);
      localStorage.setItem('currentApiKey', newKey);
      if (user) {
        setUser({
          ...user,
          apiKey: `${newKey.substring(0, 10)}...${newKey.substring(newKey.length - 4)}`
        });
      }
      alert('新しいAPIキーが生成されました。このキーは一度だけ表示されます。');
    } catch (error) {
      console.error('Failed to generate API key:', error);
      alert('APIキーの生成に失敗しました。');
    } finally {
      setIsGeneratingKey(false);
    }
  }

  const copyApiKey = () => {
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

  // 過去7日間のデータ（デモ用）
  const getLast7DaysData = () => {
    return [15, 23, 38, 45, 52, 48, stats?.totalRequests || 0];
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/" className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                <span className="hidden sm:inline">XBRL財務データAPI</span>
                <span className="sm:hidden">XBRL API</span>
              </Link>
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
                href="/examples" 
                className="hidden sm:block text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                サンプル
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
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium text-gray-900">{user.name || '未設定'}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    プロフィール
                  </Link>
                  <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    設定
                  </Link>
                  <hr className="my-1" />
                  <button 
                    onClick={() => {
                      localStorage.removeItem('user');
                      localStorage.removeItem('currentApiKey');
                      router.push('/');
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            こんにちは、{user.name || user.email.split('@')[0]}さん
          </h2>
          <p className="text-gray-600">
            {new Date().toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric', 
              weekday: 'long' 
            })}
          </p>
        </div>

        {/* クイックアクション */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button 
            onClick={() => router.push('/docs')}
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">APIドキュメント</h3>
            <p className="text-sm text-gray-600">エンドポイントとパラメータの詳細</p>
          </button>

          <button 
            onClick={() => router.push('/examples')}
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">サンプルコード</h3>
            <p className="text-sm text-gray-600">実装例とベストプラクティス</p>
          </button>

          <button 
            onClick={() => router.push('/support')}
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">サポート</h3>
            <p className="text-sm text-gray-600">ヘルプとトラブルシューティング</p>
          </button>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              {stats && stats.totalRequests > 0 && (
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                  今月
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.totalRequests.toLocaleString() || 0}</h3>
            <p className="text-sm text-gray-600 mt-1">API呼び出し</p>
            <div className="mt-2 text-xs text-green-600">
              ↑ 12% 前月比
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-600">
                {getSuccessRate().toFixed(1)}%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.successfulRequests.toLocaleString() || 0}</h3>
            <p className="text-sm text-gray-600 mt-1">成功リクエスト</p>
            <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${getSuccessRate()}%` }}></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                4,231社
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">20年分</h3>
            <p className="text-sm text-gray-600 mt-1">利用可能データ</p>
            <div className="mt-2 text-xs text-gray-500">
              2005年〜2025年
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-600">
                {user.plan === 'beta' ? 'ベータ' : user.plan || 'Free'}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.remainingQuota.toLocaleString() || 1000}</h3>
            <p className="text-sm text-gray-600 mt-1">残りAPI回数</p>
            <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${(stats?.remainingQuota || 1000) / (stats?.quotaLimit || 1000) * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              概要
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'usage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              使用状況
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              アクティビティ
            </button>
            <button
              onClick={() => setActiveTab('quickstart')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
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
        <div>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* APIキー情報 */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">APIキー情報</h3>
                  <button
                    onClick={generateNewApiKey}
                    disabled={isGeneratingKey}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    {isGeneratingKey ? '生成中...' : '新しいキーを生成'}
                  </button>
                </div>
                
                {fullApiKey || user.apiKey ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        あなたのAPIキー
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showApiKey ? "text" : "password"}
                          value={fullApiKey || user.apiKey || ''}
                          readOnly
                          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                        >
                          {showApiKey ? '隠す' : '表示'}
                        </button>
                        <button
                          onClick={copyApiKey}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          {copied ? '✓ コピー済み' : 'コピー'}
                        </button>
                      </div>
                      {!fullApiKey && user.apiKey && (
                        <p className="text-xs text-orange-600 mt-2">
                          ⚠️ マスクされたキーのみ表示されています。完全なキーを取得するには、新しいAPIキーを生成してください。
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
                        <p className="font-medium text-green-600">● アクティブ</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <p className="text-gray-600 mb-4">APIキーがまだ発行されていません</p>
                    <button
                      onClick={generateNewApiKey}
                      disabled={isGeneratingKey}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isGeneratingKey ? '生成中...' : 'APIキーを発行する'}
                    </button>
                  </div>
                )}
              </div>

              {/* アカウント情報 */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">アカウント情報</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">プラン</p>
                    <p className="font-medium text-lg">{user.plan === 'beta' ? 'ベータプラン' : user.plan || 'Free'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">月間制限</p>
                    <p className="font-medium">{stats?.quotaLimit.toLocaleString() || '1,000'}回</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">メールアドレス</p>
                    <p className="font-medium text-sm">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">会社名</p>
                    <p className="font-medium">{user.company || '未設定'}</p>
                  </div>
                  <div className="pt-4 border-t">
                    <Link
                      href="/dashboard/billing"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      プランをアップグレード →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 使用状況グラフ */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">月間使用状況</h3>
                
                <div className="space-y-6">
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

                  {/* 過去7日間のグラフ */}
                  <div>
                    <p className="text-sm text-gray-600 mb-3">過去7日間の使用状況</p>
                    <div className="flex items-end justify-between h-32 gap-2">
                      {getLast7DaysData().map((value, i) => {
                        const maxValue = Math.max(...getLast7DaysData());
                        const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center">
                            <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '128px' }}>
                              <div 
                                className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-indigo-400 rounded-t transition-all hover:from-blue-600 hover:to-indigo-500"
                                style={{ height: `${height}%` }}
                              >
                                <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700">
                                  {value}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 mt-2">
                              {['月', '火', '水', '木', '金', '土', '今日'][i]}
                            </span>
                          </div>
                        );
                      })}
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
                </div>
              </div>

              {/* 使用状況サマリー */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">使用状況サマリー</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-sm text-gray-600">今月の使用率</span>
                    <span className="font-medium">{getUsagePercentage().toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-sm text-gray-600">平均レスポンス時間</span>
                    <span className="font-medium">210ms</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-sm text-gray-600">エラー率</span>
                    <span className="font-medium text-red-600">{stats && stats.totalRequests > 0 ? ((stats.failedRequests / stats.totalRequests) * 100).toFixed(1) : '0.0'}%</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-gray-600">最終利用</span>
                    <span className="font-medium text-sm">
                      {stats?.lastRequestAt ? new Date(stats.lastRequestAt).toLocaleString('ja-JP') : '未使用'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">最近のAPIアクティビティ</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">時刻</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">メソッド</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">エンドポイント</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">ステータス</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">応答時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivities.map((activity) => (
                      <tr key={activity.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(activity.timestamp).toLocaleString('ja-JP')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            activity.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                            activity.method === 'POST' ? 'bg-green-100 text-green-700' :
                            activity.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {activity.method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-mono text-gray-700">
                          {activity.endpoint}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            activity.status >= 200 && activity.status < 300 ? 'bg-green-100 text-green-700' :
                            activity.status >= 400 && activity.status < 500 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {activity.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {activity.responseTime}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {recentActivities.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">まだアクティビティがありません</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'quickstart' && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">クイックスタートガイド</h3>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">1. 企業リストを取得</h4>
                  <div className="bg-gray-900 rounded-lg p-4 text-sm">
                    <pre className="text-green-400">
{`curl -H "X-API-Key: ${fullApiKey || 'YOUR_API_KEY'}" \\
  https://api.xbrl.jp/v1/companies`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">2. 特定企業のデータ取得</h4>
                  <div className="bg-gray-900 rounded-lg p-4 text-sm">
                    <pre className="text-green-400">
{`curl -H "X-API-Key: ${fullApiKey || 'YOUR_API_KEY'}" \\
  https://api.xbrl.jp/v1/companies/7203`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">3. 財務データ検索</h4>
                  <div className="bg-gray-900 rounded-lg p-4 text-sm">
                    <pre className="text-green-400">
{`curl -X POST -H "X-API-Key: ${fullApiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"year": 2022, "sector": "電気機器"}' \\
  https://api.xbrl.jp/v1/search`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">4. Python サンプル</h4>
                  <div className="bg-gray-900 rounded-lg p-4 text-sm">
                    <pre className="text-green-400">
{`import requests

headers = {'X-API-Key': '${fullApiKey || 'YOUR_API_KEY'}'}
response = requests.get(
  'https://api.xbrl.jp/v1/companies',
  headers=headers
)
print(response.json())`}
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
          )}
        </div>

        {/* お知らせセクション */}
        <div className="mt-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">🎉 ベータ版をご利用いただきありがとうございます</h3>
              <p className="text-blue-100">
                正式版リリース時には、ベータ参加者限定の特別価格でご利用いただけます。
              </p>
            </div>
            <Link
              href="/feedback"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              フィードバックを送る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}