'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
  plan: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');

  useEffect(() => {
    // 認証チェック
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // ユーザー情報を取得
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');
    router.push('/');
  };

  const handleEmailUpdate = () => {
    if (newEmail && user) {
      const updatedUser = { ...user, email: newEmail };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setIsEditingEmail(false);
      setNewEmail('');
    }
  };

  const handlePlanUpdate = () => {
    if (selectedPlan && user) {
      const updatedUser = { ...user, plan: selectedPlan };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setIsEditingPlan(false);
    }
  };


  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                財務データMCP
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* メインコンテンツ */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="p-6">
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-green-50 rounded-lg p-6">
                    <div className="text-3xl font-bold text-green-600">10年分</div>
                    <div className="text-sm text-gray-600 mt-1">財務データ履歴</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-6">
                    <div className="text-3xl font-bold text-purple-600">
                      {user.plan === 'free' ? '直近1年' : '無制限'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">データアクセス範囲</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">利用可能な機能</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-3 text-sm">
                      <li className="flex">
                        <span className="text-green-600 font-bold mr-3">✓</span>
                        <span>日本の全上場企業の財務データへのアクセス</span>
                      </li>
                      <li className="flex">
                        <span className="text-green-600 font-bold mr-3">✓</span>
                        <span>10年分の有価証券報告書の閲覧</span>
                      </li>
                      <li className="flex">
                        <span className="text-green-600 font-bold mr-3">✓</span>
                        <span>財務データの分析とダウンロード</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* MCP設定セクション */}
                <div className="mt-8 pt-8 border-t">
                  <h3 className="text-lg font-semibold mb-4">MCP Server設定（Claude Desktop向け）</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-3">
                      <code className="bg-gray-200 px-2 py-1 rounded">%APPDATA%\Claude\claude_desktop_config.json</code> に追加するだけ:
                    </p>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-sm font-mono">{`{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["--loglevel=error", "shared-supabase-mcp-minimal@1.8.1"]
    }
  }
}`}</pre>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["--loglevel=error", "shared-supabase-mcp-minimal@1.8.1"]
    }
  }
}`);
                        alert('設定をコピーしました！');
                      }}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      設定をコピー
                    </button>
                  </div>
                </div>

                {/* アカウント設定セクション */}
                <div className="mt-8 pt-8 border-t">
                  <h3 className="text-lg font-semibold mb-4">アカウント設定</h3>
                  
                  {/* メールアドレス変更 */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      メールアドレス
                    </label>
                    {!isEditingEmail ? (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900">{user.email}</span>
                        <button
                          onClick={() => {
                            setIsEditingEmail(true);
                            setNewEmail(user.email);
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          変更
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleEmailUpdate}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingEmail(false);
                            setNewEmail('');
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          キャンセル
                        </button>
                      </div>
                    )}
                  </div>

                  {/* プラン変更 */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      プラン
                    </label>
                    {!isEditingPlan ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-900 font-semibold uppercase">{user.plan}</span>
                          <span className="text-gray-600 ml-2">
                            ({user.plan === 'free' ? '直近1年データアクセス' : '制限なしアクセス'})
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setIsEditingPlan(true);
                            setSelectedPlan(user.plan);
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          変更
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="space-y-3 mb-4">
                          <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              value="free"
                              checked={selectedPlan === 'free'}
                              onChange={(e) => setSelectedPlan(e.target.value)}
                              className="mr-3"
                            />
                            <div>
                              <div className="font-semibold">Free - ¥0/月</div>
                              <div className="text-sm text-gray-600">直近1年データアクセス</div>
                            </div>
                          </label>
                          <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              value="pro"
                              checked={selectedPlan === 'pro'}
                              onChange={(e) => setSelectedPlan(e.target.value)}
                              className="mr-3"
                            />
                            <div>
                              <div className="font-semibold">Pro - ¥2,980/月</div>
                              <div className="text-sm text-gray-600">制限なしアクセス</div>
                            </div>
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handlePlanUpdate}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            プラン変更
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingPlan(false);
                              setSelectedPlan('');
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}