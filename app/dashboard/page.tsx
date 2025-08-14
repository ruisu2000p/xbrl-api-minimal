'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey] = useState('sk_test_' + Math.random().toString(36).substring(2, 15));
  const [copySuccess, setCopySuccess] = useState(false);
  
  // デモ用のユーザー情報
  const [user] = useState({
    name: 'デモユーザー',
    email: 'demo@example.com',
    plan: 'standard',
    apiCalls: 1234,
    apiLimit: 3000,
    dataYears: 5,
    joinDate: '2024年1月15日'
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const usageData = [
    { date: '2024-01-08', calls: 145 },
    { date: '2024-01-09', calls: 189 },
    { date: '2024-01-10', calls: 234 },
    { date: '2024-01-11', calls: 178 },
    { date: '2024-01-12', calls: 267 },
    { date: '2024-01-13', calls: 198 },
    { date: '2024-01-14', calls: 223 }
  ];

  const recentRequests = [
    { time: '10:23:45', endpoint: '/api/v1/companies/7203', status: 200, duration: '45ms' },
    { time: '10:22:12', endpoint: '/api/v1/financial?company_id=6758', status: 200, duration: '38ms' },
    { time: '10:20:55', endpoint: '/api/v1/documents?year=2023', status: 200, duration: '52ms' },
    { time: '10:18:33', endpoint: '/api/v1/companies', status: 200, duration: '41ms' },
    { time: '10:15:21', endpoint: '/api/v1/search?q=トヨタ', status: 200, duration: '67ms' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">X</span>
              </div>
              <h1 className="text-xl font-bold">XBRL財務データAPI</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-sm bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors"
              >
                APIキー表示
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">D</span>
                </div>
                <span className="text-sm font-medium">{user.email}</span>
              </div>
              <button
                onClick={() => router.push('/')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* APIキー表示モーダル */}
        {showApiKey && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">APIキー情報</h2>
                <button
                  onClick={() => setShowApiKey(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">あなたのAPIキー</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={apiKey}
                      readOnly
                      className="flex-1 px-4 py-2 bg-gray-100 rounded-lg font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(apiKey)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {copySuccess ? '✓ コピー済み' : 'コピー'}
                    </button>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">⚠️ 重要:</span> このAPIキーは秘密情報です。第三者と共有しないでください。
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">使用例</h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -H "X-API-Key: ${apiKey}" \\
  https://api.xbrl.jp/v1/companies`}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Claude Desktop設定</h3>
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "xbrl_api": {
    "api_key": "${apiKey}"
  }
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ウェルカムメッセージ */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white mb-8">
          <h2 className="text-3xl font-bold mb-2">ようこそ、{user.name}さん！</h2>
          <p className="text-blue-100 mb-4">
            現在のプラン: <span className="font-semibold text-white">Standardプラン</span> • 
            利用開始日: {user.joinDate}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold">{user.apiCalls.toLocaleString()}</div>
              <div className="text-sm text-blue-100">今月のAPI呼び出し</div>
              <div className="text-xs text-blue-200 mt-1">{user.apiLimit.toLocaleString()}回まで</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold">{user.dataYears}年分</div>
              <div className="text-sm text-blue-100">アクセス可能データ</div>
              <div className="text-xs text-blue-200 mt-1">2019年〜2023年</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-sm text-blue-100">稼働率</div>
              <div className="text-xs text-blue-200 mt-1">過去30日間</div>
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="bg-white rounded-t-xl border-b">
          <nav className="flex gap-8 px-6">
            {[
              { id: 'overview', label: '概要', icon: '📊' },
              { id: 'usage', label: '使用状況', icon: '📈' },
              { id: 'docs', label: 'ドキュメント', icon: '📚' },
              { id: 'billing', label: '請求', icon: '💳' },
              { id: 'settings', label: '設定', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* コンテンツエリア */}
        <div className="bg-white rounded-b-xl p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">クイックスタート</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <a href="/docs" className="block p-4 border rounded-lg hover:border-blue-500 transition-colors">
                    <div className="text-2xl mb-2">📖</div>
                    <div className="font-medium">APIドキュメント</div>
                    <div className="text-sm text-gray-600">エンドポイントの詳細を確認</div>
                  </a>
                  <a href="/sdk" className="block p-4 border rounded-lg hover:border-blue-500 transition-colors">
                    <div className="text-2xl mb-2">🔧</div>
                    <div className="font-medium">SDK & ツール</div>
                    <div className="text-sm text-gray-600">各言語のSDKをダウンロード</div>
                  </a>
                  <a href="/examples" className="block p-4 border rounded-lg hover:border-blue-500 transition-colors">
                    <div className="text-2xl mb-2">💡</div>
                    <div className="font-medium">サンプルコード</div>
                    <div className="text-sm text-gray-600">実装例を参考にする</div>
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">最近のAPIリクエスト</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">時刻</th>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">エンドポイント</th>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">ステータス</th>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">応答時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRequests.map((request, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-4 text-sm">{request.time}</td>
                          <td className="py-2 px-4 text-sm font-mono">{request.endpoint}</td>
                          <td className="py-2 px-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {request.status}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-sm">{request.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">API使用状況（過去7日間）</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-end gap-2 h-48">
                    {usageData.map((data, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-gradient-to-t from-blue-600 to-indigo-600 rounded-t"
                          style={{ height: `${(data.calls / 300) * 100}%` }}
                        ></div>
                        <div className="text-xs text-gray-600 mt-2">{data.calls}</div>
                        <div className="text-xs text-gray-500">{data.date.slice(5)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">エンドポイント別使用状況</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm">/api/v1/companies</span>
                      <span className="text-sm font-medium">523回</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm">/api/v1/financial</span>
                      <span className="text-sm font-medium">412回</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm">/api/v1/documents</span>
                      <span className="text-sm font-medium">299回</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">レート制限</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>今月の使用量</span>
                        <span>{user.apiCalls} / {user.apiLimit}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full"
                          style={{ width: `${(user.apiCalls / user.apiLimit) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      残り: {(user.apiLimit - user.apiCalls).toLocaleString()}回
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">APIドキュメント</h3>
                <div className="prose max-w-none">
                  <h4 className="text-base font-semibold mb-2">基本情報</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>ベースURL: <code className="bg-gray-100 px-2 py-1 rounded">https://api.xbrl.jp/v1</code></li>
                    <li>認証: APIキーをヘッダーに含める <code className="bg-gray-100 px-2 py-1 rounded">X-API-Key: your_api_key</code></li>
                    <li>レスポンス形式: JSON</li>
                  </ul>

                  <h4 className="text-base font-semibold mt-6 mb-2">主要エンドポイント</h4>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-semibold">GET</span>
                        <code className="text-sm font-mono">/companies</code>
                      </div>
                      <p className="text-sm text-gray-600">企業一覧を取得します</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-semibold">GET</span>
                        <code className="text-sm font-mono">/companies/{'{company_id}'}</code>
                      </div>
                      <p className="text-sm text-gray-600">特定企業の詳細情報を取得します</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-semibold">GET</span>
                        <code className="text-sm font-mono">/financial</code>
                      </div>
                      <p className="text-sm text-gray-600">財務データを取得します</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">現在のプラン</h3>
                <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-xl font-bold">Standardプラン</h4>
                      <p className="text-gray-600">個人開発者・スタートアップ向け</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">¥1,080</div>
                      <div className="text-sm text-gray-600">/月</div>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      直近5年分のデータアクセス
                    </li>
                    <li className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      3,000回/月のAPI呼び出し
                    </li>
                    <li className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      メールサポート
                    </li>
                  </ul>
                  <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    プランを変更
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">請求履歴</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">日付</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">説明</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">金額</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ステータス</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="py-3 px-4 text-sm">2024年1月1日</td>
                        <td className="py-3 px-4 text-sm">Standardプラン - 1月分</td>
                        <td className="py-3 px-4 text-sm">¥1,080</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            支払済み
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">アカウント設定</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">名前</label>
                    <input
                      type="text"
                      defaultValue={user.name}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label>
                    <input
                      type="email"
                      defaultValue={user.email}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    変更を保存
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">セキュリティ</h3>
                <div className="space-y-4">
                  <button className="text-blue-600 hover:underline text-sm">
                    パスワードを変更
                  </button>
                  <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <span className="font-semibold">推奨:</span> 2要素認証を有効にしてアカウントのセキュリティを強化しましょう
                    </p>
                    <button className="mt-2 text-sm text-yellow-700 hover:underline font-semibold">
                      2要素認証を設定
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}