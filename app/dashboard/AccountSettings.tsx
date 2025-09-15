'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountSettings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [email, setEmail] = useState('user@example.com');
  const [apiKeys, setApiKeys] = useState([
    {
      id: '1',
      name: 'Production API Key',
      key: 'fin_live_sk_1234567890abcdef',
      created: '2024-01-15',
      lastUsed: '2時間前'
    },
    {
      id: '2',
      name: 'Development API Key',
      key: 'fin_test_sk_abcdef1234567890',
      created: '2024-01-10',
      lastUsed: '1日前'
    }
  ]);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const router = useRouter();

  const currentPlan = {
    name: 'スタンダード',
    price: '¥2,980/月',
    nextBilling: '2024-02-15',
    status: 'アクティブ'
  };

  const generateApiKey = () => {
    if (!newKeyName.trim()) return;
    
    const newKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `fin_live_sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      created: new Date().toISOString().split('T')[0],
      lastUsed: '未使用'
    };
    
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName('');
    setShowNewKeyModal(false);
  };

  const deleteApiKey = (id: string) => {
    setApiKeys(apiKeys.filter(key => key.id !== id));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleLogout = () => {
    // ログアウト処理
    router.push('/login');
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg">
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between px-6">
          <div className="flex space-x-8">
            {[
              { id: 'profile', name: 'プロフィール', icon: 'ri-user-line' },
              { id: 'plan', name: 'プラン管理', icon: 'ri-vip-crown-line' },
              { id: 'api', name: 'APIキー', icon: 'ri-key-line' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className={`${tab.icon} text-lg`}></i>
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </div>
          
          <div className="py-4">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-logout-box-line"></i>
              <span className="font-medium">ログアウト</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* プロフィール設定 */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">プロフィール設定</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                <div className="flex space-x-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="メールアドレスを入力"
                  />
                  <button className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap text-sm">
                    更新
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ユーザー名
                </label>
                <input
                  type="text"
                  defaultValue="田中太郎"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="ユーザー名を入力"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                会社名
              </label>
              <input
                type="text"
                defaultValue="株式会社サンプル"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="会社名を入力"
              />
            </div>

            <div className="flex justify-end">
              <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-save-line mr-2"></i>
                変更を保存
              </button>
            </div>
          </div>
        )}

        {/* プラン管理 */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">プラン管理</h3>
            </div>

            {/* 現在のプラン */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                    <i className="ri-vip-crown-line text-white text-xl"></i>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{currentPlan.name}</h4>
                    <p className="text-blue-600 font-medium">{currentPlan.price}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                    <i className="ri-check-line mr-1"></i>
                    {currentPlan.status}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <i className="ri-calendar-line text-blue-600"></i>
                  <span className="text-sm text-gray-700">次回請求日: {currentPlan.nextBilling}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <i className="ri-shield-check-line text-blue-600"></i>
                  <span className="text-sm text-gray-700">自動更新: 有効</span>
                </div>
              </div>
            </div>

            {/* プラン変更オプション */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <i className="ri-seedling-line text-gray-600"></i>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">フリーミアム</h4>
                    <p className="text-sm text-gray-600">¥0/月</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 mb-4">
                  <li className="flex items-center">
                    <i className="ri-check-line text-green-500 mr-2"></i>
                    直近1年間のデータアクセス
                  </li>
                </ul>
                <button className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap text-sm">
                  ダウングレード
                </button>
              </div>

              <div className="border border-blue-200 bg-blue-50 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <i className="ri-vip-crown-line text-white"></i>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">スタンダード</h4>
                    <p className="text-sm text-blue-600 font-medium">¥2,980/月 (現在のプラン)</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 mb-4">
                  <li className="flex items-center">
                    <i className="ri-check-line text-green-500 mr-2"></i>
                    全期間の財務データアクセス
                  </li>
                  <li className="flex items-center">
                    <i className="ri-check-line text-green-500 mr-2"></i>
                    基本的なサポート
                  </li>
                </ul>
                <button className="w-full py-2 bg-blue-600 text-white rounded-lg cursor-pointer whitespace-nowrap text-sm opacity-50" disabled>
                  現在のプラン
                </button>
              </div>
            </div>

            {/* 請求履歴 */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">請求履歴</h4>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="space-y-3">
                  {[
                    { date: '2024-01-15', amount: '¥2,980', status: '支払い済み' },
                    { date: '2023-12-15', amount: '¥2,980', status: '支払い済み' },
                    { date: '2023-11-15', amount: '¥2,980', status: '支払い済み' }
                  ].map((bill, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <i className="ri-file-text-line text-gray-500"></i>
                        <span className="text-sm font-medium text-gray-900">{bill.date}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-900">{bill.amount}</span>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          {bill.status}
                        </span>
                        <button className="text-blue-600 hover:text-blue-700 text-sm cursor-pointer">
                          ダウンロード
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* APIキー管理 */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">APIキー管理</h3>
              <button
                onClick={() => setShowNewKeyModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap text-sm"
              >
                <i className="ri-add-line mr-2"></i>
                新しいキーを作成
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <i className="ri-warning-line text-yellow-600 mt-0.5"></i>
                <div>
                  <h4 className="font-medium text-yellow-800">APIキーの管理について</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    APIキーは機密情報です。安全な場所に保管し、第三者と共有しないでください。
                    キーが漏洩した場合は、すぐに削除して新しいキーを作成してください。
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">{key.name}</h4>
                      <p className="text-sm text-gray-500">作成日: {key.created} | 最終使用: {key.lastUsed}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyToClipboard(key.key)}
                        className="text-blue-600 hover:text-blue-700 text-sm cursor-pointer"
                      >
                        <i className="ri-file-copy-line mr-1"></i>
                        コピー
                      </button>
                      <button
                        onClick={() => deleteApiKey(key.id)}
                        className="text-red-600 hover:text-red-700 text-sm cursor-pointer"
                      >
                        <i className="ri-delete-bin-line mr-1"></i>
                        削除
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <code className="text-sm font-mono text-gray-700 flex-1">{key.key}</code>
                      <button
                        onClick={() => copyToClipboard(key.key)}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        <i className="ri-file-copy-line"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {apiKeys.length === 0 && (
              <div className="text-center py-12">
                <i className="ri-key-line text-gray-300 text-6xl mb-4"></i>
                <h4 className="text-lg font-medium text-gray-500 mb-2">APIキーがありません</h4>
                <p className="text-gray-400 mb-6">最初のAPIキーを作成して、財務データAPIの利用を開始しましょう。</p>
                <button
                  onClick={() => setShowNewKeyModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  APIキーを作成
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 新しいAPIキー作成モーダル */}
      {showNewKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">新しいAPIキーを作成</h3>
              <button
                onClick={() => setShowNewKeyModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  キー名
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="例: Production API Key"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <i className="ri-information-line text-blue-600 mt-0.5"></i>
                  <div>
                    <h4 className="font-medium text-blue-800 text-sm">重要な注意事項</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      作成されたAPIキーは一度のみ表示されます。安全な場所に保存してください。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowNewKeyModal(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                キャンセル
              </button>
              <button
                onClick={generateApiKey}
                disabled={!newKeyName.trim()}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ログアウト確認モーダル */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">ログアウト確認</h3>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="ri-logout-box-line text-red-600 text-xl"></i>
                </div>
                <div>
                  <p className="text-gray-900">本当にログアウトしますか？</p>
                  <p className="text-sm text-gray-600">再度ログインが必要になります。</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                キャンセル
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}