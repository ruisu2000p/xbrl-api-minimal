'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Copy,
  Key,
  User,
  CreditCard,
  FileText,
  RefreshCw,
  Check
} from 'react-feather';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// 型定義
interface User {
  id: string;
  email: string;
  name?: string;
  plan?: string;
  apiKey?: string;
  createdAt?: string;
}


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchApiKey();
    fetchProfile();
  }, []);

  async function checkAuth() {
    // LocalStorageをチェック（後方互換性のため）
    const localUser = localStorage.getItem('user');
    if (!localUser) {
      // デモモードで続行
      setUser({
        id: 'demo',
        email: 'demo@example.com',
        plan: 'beta',
        createdAt: new Date().toISOString()
      });
      setLoading(false);
      return;
    }
    
    const userData = JSON.parse(localUser);
    setUser(userData);
    setLoading(false);
  }

  async function fetchProfile() {
    try {
      const response = await fetch('/api/dashboard/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.user && !data.isDemo) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }

  async function fetchApiKey() {
    try {
      // Supabaseから取得を試みる
      const response = await fetch('/api/dashboard/api-key');
      if (response.ok) {
        const data = await response.json();
        setApiKey(data.apiKey);
        // LocalStorageにもキャッシュ（MCP用）
        localStorage.setItem('apiKey', data.apiKey);
      } else {
        // フォールバック: LocalStorageから取得
        const storedKey = localStorage.getItem('apiKey') || 'xbrl_demo_' + Math.random().toString(36).substring(2, 15);
        setApiKey(storedKey);
      }
    } catch (error) {
      console.error('Failed to fetch API key:', error);
      // エラー時はLocalStorageから取得
      const storedKey = localStorage.getItem('apiKey') || 'xbrl_demo_' + Math.random().toString(36).substring(2, 15);
      setApiKey(storedKey);
    }
  }

  async function generateNewApiKey() {
    setGenerating(true);
    try {
      // Supabase経由で新しいAPIキーを生成
      const response = await fetch('/api/dashboard/api-key', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKey(data.apiKey);
        // LocalStorageにもキャッシュ（MCP用）
        localStorage.setItem('apiKey', data.apiKey);
        alert('新しいAPIキーが生成されました');
      } else {
        // エラー時はローカルで生成
        const newKey = `xbrl_demo_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        setApiKey(newKey);
        localStorage.setItem('apiKey', newKey);
        alert('新しいAPIキーが生成されました（デモモード）');
      }
    } catch (error) {
      console.error('Failed to generate API key:', error);
      // エラー時はローカルで生成
      const newKey = `xbrl_demo_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      setApiKey(newKey);
      localStorage.setItem('apiKey', newKey);
      alert('新しいAPIキーが生成されました（デモモード）');
    } finally {
      setGenerating(false);
    }
  }

  function copyApiKey() {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getPlanDetails(plan: string) {
    const plans: Record<string, { name: string; price: string; color: string }> = {
      beta: { name: 'ベータ', price: '無料', color: 'bg-blue-100 text-blue-800' },
      free: { name: 'Free', price: '¥0', color: 'bg-gray-100 text-gray-800' },
      standard: { name: 'Standard', price: '¥1,080', color: 'bg-green-100 text-green-800' },
      pro: { name: 'Pro', price: '¥2,980', color: 'bg-purple-100 text-purple-800' }
    };
    return plans[plan] || plans.beta;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const planDetails = getPlanDetails(user?.plan || 'beta');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
            <div className="flex items-center gap-4">
              <Link href="/profile" className="text-gray-600 hover:text-gray-900">
                <User className="w-5 h-5" />
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem('user');
                  localStorage.removeItem('apiKey');
                  router.push('/');
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ユーザー情報カード */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">アカウント情報</h2>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${planDetails.color}`}>
              {planDetails.name}プラン
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-600">プラン料金</p>
              <p className="text-lg font-semibold">{planDetails.price}/月</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">登録日</p>
              <p className="text-lg font-semibold">
                {user?.createdAt ? format(new Date(user.createdAt), 'yyyy年MM月dd日', { locale: ja }) : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* APIキー管理 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Key className="w-5 h-5" />
              APIキー
            </h2>
            <button
              onClick={generateNewApiKey}
              disabled={generating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              新規生成
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono">
                {showApiKey ? apiKey : `${apiKey.substring(0, 10)}${'*'.repeat(20)}`}
              </code>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                >
                  {showApiKey ? '隠す' : '表示'}
                </button>
                <button
                  onClick={copyApiKey}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'コピー済み' : 'コピー'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* APIドキュメント */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            APIドキュメント
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">利用可能なエンドポイント</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="font-mono text-sm">
                  <span className="text-green-600">GET</span> /api/v1/companies
                  <p className="text-gray-600 ml-12">企業一覧を取得</p>
                </div>
                <div className="font-mono text-sm">
                  <span className="text-green-600">GET</span> /api/v1/companies/{'{id}'}
                  <p className="text-gray-600 ml-12">企業詳細を取得</p>
                </div>
                <div className="font-mono text-sm">
                  <span className="text-blue-600">POST</span> /api/v1/search
                  <p className="text-gray-600 ml-12">企業を検索</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">使用例</h3>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://xbrl-api-minimal.vercel.app/api/v1/companies`}
                </pre>
              </div>
            </div>

            <div className="flex gap-4">
              <Link
                href="/docs"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                詳細なドキュメントを見る →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}