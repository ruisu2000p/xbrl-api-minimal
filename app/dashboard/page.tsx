'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SimpleLogin from './simple-login';
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
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // userが設定された後にAPIキーを取得
  useEffect(() => {
    if (user) {
      fetchApiKey();
    }
  }, [user]);

  async function checkAuth() {
    // LocalStorageをチェック
    const localUser = localStorage.getItem('user');
    if (!localUser) {
      // ログインが必要
      setNeedsLogin(true);
      setLoading(false);
      return;
    }
    
    const userData = JSON.parse(localUser);
    setUser(userData);
    setLoading(false);
    // プロファイルを取得
    fetchProfile(userData.email);
  }

  async function fetchProfile(email: string) {
    try {
      const response = await fetch('/api/dashboard/profile', {
        headers: {
          'x-user-email': email
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Profile data:', data);
        if (data.user) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }

  function handleLogin(email: string) {
    setNeedsLogin(false);
    checkAuth();
  }

  async function fetchApiKey() {
    try {
      // ユーザーのメールアドレスを取得
      const userEmail = user?.email || 'demo@example.com';
      
      // Supabaseから取得を試みる
      const response = await fetch('/api/dashboard/api-key', {
        headers: {
          'x-user-email': userEmail
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('API key response:', data);
        setApiKey(data.apiKey);
        // LocalStorageにもキャッシュ（MCP用）
        localStorage.setItem('apiKey', data.apiKey);
      } else {
        const errorData = await response.json();
        console.error('API key fetch failed:', errorData);
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
      // ユーザーのメールアドレスを取得
      const userEmail = user?.email || 'demo@example.com';
      
      // Supabase経由で新しいAPIキーを生成
      const response = await fetch('/api/dashboard/api-key', {
        method: 'POST',
        headers: {
          'x-user-email': userEmail
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('New API key generated:', data);
        setApiKey(data.apiKey);
        // LocalStorageにもキャッシュ（MCP用）
        localStorage.setItem('apiKey', data.apiKey);
        alert('新しいAPIキーが生成されました');
      } else {
        const errorData = await response.json();
        console.error('API key generation failed:', errorData);
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

  if (needsLogin) {
    return <SimpleLogin onLogin={handleLogin} />;
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
                  setNeedsLogin(true);
                  setUser(null);
                  setApiKey('');
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

        {/* Claude Desktop MCP連携 */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Claude Desktop連携設定
          </h2>
          
          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-gray-700 mb-4">
              Claude DesktopからXBRL財務データAPIに直接アクセスできるよう設定します。
            </p>
            
            <div className="space-y-4">
              <div className="border-l-4 border-purple-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">ステップ 1: 設定ファイルを開く</h3>
                <div className="bg-gray-50 rounded p-3 space-y-2">
                  <div>
                    <span className="font-medium">Windows:</span>
                    <code className="block mt-1 text-sm bg-gray-100 px-2 py-1 rounded">%APPDATA%\Claude\claude_desktop_config.json</code>
                  </div>
                  <div>
                    <span className="font-medium">macOS:</span>
                    <code className="block mt-1 text-sm bg-gray-100 px-2 py-1 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</code>
                  </div>
                  <div>
                    <span className="font-medium">Linux:</span>
                    <code className="block mt-1 text-sm bg-gray-100 px-2 py-1 rounded">~/.config/Claude/claude_desktop_config.json</code>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-purple-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">ステップ 2: 以下の設定を追加</h3>
                <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm">
{`{
  "mcpServers": {
    "xbrl-api": {
      "command": "node",
      "args": ["C:/path/to/mcp-xbrl-server.js"],
      "env": {
        "XBRL_API_KEY": "${apiKey}"
      }
    }
  }
}`}
                  </pre>
                </div>
                <button
                  onClick={() => {
                    const config = {
                      mcpServers: {
                        "xbrl-api": {
                          command: "node",
                          args: ["C:/path/to/mcp-xbrl-server.js"],
                          env: {
                            XBRL_API_KEY: apiKey
                          }
                        }
                      }
                    };
                    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  設定をコピー
                </button>
              </div>

              <div className="border-l-4 border-purple-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">ステップ 3: MCPサーバーファイルを作成</h3>
                <p className="text-gray-600 mb-2">
                  <a href="https://github.com/ruisu2000p/xbrl-api-minimal/blob/main/mcp-server/mcp-xbrl-server.js" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="text-blue-600 hover:text-blue-700 underline">
                    MCPサーバーファイル
                  </a>
                  をダウンロードして、任意の場所に保存してください。
                </p>
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-sm text-blue-700">
                    💡 <code className="bg-blue-100 px-1 rounded">C:/path/to/mcp-xbrl-server.js</code> を実際のファイルパスに置き換えてください
                  </p>
                </div>
              </div>

              <div className="border-l-4 border-purple-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">ステップ 4: Claude Desktopを再起動</h3>
                <p className="text-gray-600">
                  設定を反映させるため、Claude Desktopアプリケーションを完全に終了してから再起動してください。
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">✅ 設定完了後の使用例</h3>
            <ul className="space-y-2 text-sm text-green-700">
              <li>「トヨタ自動車の財務データを取得してください」</li>
              <li>「自動車メーカー5社の売上高を比較してください」</li>
              <li>「2021年度の営業利益上位10社を教えてください」</li>
            </ul>
          </div>
        </div>

      </main>
    </div>
  );
}