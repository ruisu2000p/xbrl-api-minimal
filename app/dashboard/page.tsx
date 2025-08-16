'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
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

interface ApiUsage {
  used: number;
  limit: number;
  percentage: number;
}

interface DailyUsage {
  date: string;
  count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState<ApiUsage>({ used: 342, limit: 1000, percentage: 34.2 });
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchApiKey();
    fetchUsageData();
  }, []);

  async function checkAuth() {
    const localUser = localStorage.getItem('user');
    if (!localUser) {
      router.push('/login');
      return;
    }
    
    const userData = JSON.parse(localUser);
    setUser(userData);
    setLoading(false);
  }

  async function fetchApiKey() {
    // 実際のAPIキーを取得（本番環境では実際のAPIエンドポイントを使用）
    const storedKey = localStorage.getItem('apiKey') || 'xbrl_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4';
    setApiKey(storedKey);
  }

  async function fetchUsageData() {
    // 過去7日間の使用状況（本番環境では実際のAPIを呼び出す）
    const data: DailyUsage[] = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: format(date, 'MM/dd', { locale: ja }),
        count: Math.floor(Math.random() * 50) + 10
      };
    });
    setDailyUsage(data);
  }

  async function generateNewApiKey() {
    setGenerating(true);
    // 新しいAPIキーを生成（本番環境では実際のAPIを呼び出す）
    setTimeout(() => {
      const newKey = `xbrl_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      setApiKey(newKey);
      localStorage.setItem('apiKey', newKey);
      setGenerating(false);
      alert('新しいAPIキーが生成されました');
    }, 1000);
  }

  function copyApiKey() {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getPlanDetails(plan: string) {
    const plans: Record<string, { name: string; limit: number; price: string; color: string }> = {
      beta: { name: 'ベータ', limit: 1000, price: '無料', color: 'bg-blue-100 text-blue-800' },
      free: { name: 'Free', limit: 100, price: '¥0', color: 'bg-gray-100 text-gray-800' },
      standard: { name: 'Standard', limit: 3000, price: '¥1,080', color: 'bg-green-100 text-green-800' },
      pro: { name: 'Pro', limit: -1, price: '¥2,980', color: 'bg-purple-100 text-purple-800' }
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-600">プラン料金</p>
              <p className="text-lg font-semibold">{planDetails.price}/月</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">API制限</p>
              <p className="text-lg font-semibold">
                {planDetails.limit === -1 ? '無制限' : `${planDetails.limit}回/月`}
              </p>
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

        {/* 使用状況 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">今月の使用状況</h2>
          
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{usage.used}回使用</span>
              <span>{usage.limit}回まで</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full"
                style={{ width: `${usage.percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              残り {usage.limit - usage.used} 回
            </p>
          </div>

          {/* 日別使用状況グラフ */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
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