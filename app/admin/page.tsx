'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [showUserDetails, setShowUserDetails] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [realStats, setRealStats] = useState<any>(null);
  const [realUsers, setRealUsers] = useState<any[]>([]);

  // リアルタイム統計データをフェッチ
  useEffect(() => {
    fetchRealData();
    const interval = setInterval(fetchRealData, 30000); // 30秒ごとに更新
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const fetchRealData = async () => {
    try {
      // 統計データ取得
      const statsResponse = await fetch(`/api/admin/statistics?period=${selectedPeriod}`);
      const statsData = await statsResponse.json();
      setRealStats(statsData.overview);

      // ユーザーデータ取得
      const usersResponse = await fetch('/api/admin/users?per_page=100');
      const usersData = await usersResponse.json();
      setRealUsers(usersData.users || []);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setIsLoading(false);
    }
  };

  // デフォルト値（データ取得中に表示）
  const stats = realStats || {
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    monthlyRevenue: 0,
    apiCallsToday: 0,
    systemUptime: 99.9,
    avgResponseTime: 0
  };

  // ユーザーデータを実データから生成
  const users = realUsers.map(user => ({
    id: user.id,
    name: user.name || '未設定',
    email: user.email,
    plan: user.subscription_plan || 'free',
    status: user.is_active ? 'active' : 'suspended',
    apiCalls: user.monthly_api_calls || 0,
    joinDate: user.join_date ? new Date(user.join_date).toLocaleDateString('ja-JP') : '-',
    revenue: user.subscription_plan === 'pro' ? 2980 : user.subscription_plan === 'standard' ? 1080 : 0
  }));

  // システムログ（リアルタイムに更新される予定）
  const systemLogs: Array<{time: string, level: string, message: string, details: string}> = [];

  // 収益グラフデータ（実データから生成）
  const revenueData: Array<{month: string, revenue: number, users: number}> = [];

  // APIエンドポイント統計（実データから生成）
  const apiEndpoints: Array<{endpoint: string, calls: number, avgTime: string, errorRate: string}> = [];

  const handleUserAction = (userId: string, action: string) => {
    alert(`アクション: ${action} - ユーザーID: ${userId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-gray-900 font-bold">A</span>
              </div>
              <h1 className="text-xl font-bold">XBRL API 管理コンソール</h1>
              <span className="bg-yellow-500 text-gray-900 text-xs px-2 py-1 rounded-full font-bold">ADMIN</span>
            </div>
            <div className="flex items-center gap-4">
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-gray-800 text-sm px-3 py-1 rounded border border-gray-700"
              >
                <option value="1d">過去24時間</option>
                <option value="7d">過去7日間</option>
                <option value="30d">過去30日間</option>
                <option value="90d">過去90日間</option>
              </select>
              <button
                onClick={() => router.push('/')}
                className="text-sm bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メイン統計 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">総ユーザー数</span>
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {isLoading ? '-' : stats.totalUsers.toLocaleString()}
            </div>
            <div className="text-sm text-green-600 mt-2">
              {isLoading ? '-' : `+${stats.newUsersToday} 今日`}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">月間収益</span>
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {isLoading ? '-' : `¥${stats.monthlyRevenue.toLocaleString()}`}
            </div>
            <div className="text-sm text-gray-600 mt-2">月間収益</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">API呼び出し</span>
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {isLoading ? '-' : stats.apiCallsToday > 1000 ? `${(stats.apiCallsToday / 1000).toFixed(1)}k` : stats.apiCallsToday}
            </div>
            <div className="text-sm text-gray-600 mt-2">今日の呼び出し</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">システム稼働率</span>
              <span className="text-2xl">🟢</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {isLoading ? '-' : `${stats.systemUptime}%`}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {isLoading ? '-' : `平均応答: ${stats.avgResponseTime}ms`}
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="bg-white rounded-t-xl border-b mt-6">
          <nav className="flex gap-8 px-6">
            {[
              { id: 'overview', label: '概要', icon: '📈' },
              { id: 'users', label: 'ユーザー管理', icon: '👥' },
              { id: 'api', label: 'API監視', icon: '🔌' },
              { id: 'revenue', label: '収益分析', icon: '💰' },
              { id: 'system', label: 'システム', icon: '⚙️' }
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
                <h3 className="text-lg font-semibold mb-4">収益推移</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-end gap-4 h-64">
                    {revenueData.map((data, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-gradient-to-t from-blue-600 to-indigo-600 rounded-t relative group">
                          <div 
                            style={{ height: `${(data.revenue / 200000) * 240}px` }}
                            className="cursor-pointer"
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              ¥{data.revenue.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-medium mt-2">{data.month}</div>
                        <div className="text-xs text-gray-500">{data.users}人</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">プラン別ユーザー分布</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <span className="text-sm">Free</span>
                      </div>
                      <span className="text-sm font-medium">623人 (48.5%)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        <span className="text-sm">Standard</span>
                      </div>
                      <span className="text-sm font-medium">489人 (38.1%)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                        <span className="text-sm">Pro</span>
                      </div>
                      <span className="text-sm font-medium">172人 (13.4%)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">最近のシステムログ</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {systemLogs.map((log, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded">
                        <span className="text-xs text-gray-500 font-mono">{log.time}</span>
                        <span className={`text-xs px-1 rounded font-medium ${
                          log.level === 'error' ? 'bg-red-100 text-red-700' :
                          log.level === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-700 flex-1">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">ユーザー管理</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ユーザー検索..."
                    className="px-4 py-2 border rounded-lg text-sm"
                  />
                  <select className="px-4 py-2 border rounded-lg text-sm">
                    <option>全プラン</option>
                    <option>Free</option>
                    <option>Standard</option>
                    <option>Pro</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ユーザー</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">プラン</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ステータス</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">API使用量</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">月額</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">登録日</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="text-sm font-medium">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.plan === 'pro' ? 'bg-purple-100 text-purple-800' :
                            user.plan === 'standard' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.plan.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === 'active' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {user.status === 'active' ? 'アクティブ' : '停止中'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{user.apiCalls.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm">¥{user.revenue.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{user.joinDate}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setShowUserDetails(user.id)}
                              className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleUserAction(user.id, 'edit')}
                              className="text-gray-600 hover:bg-gray-50 p-1 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleUserAction(user.id, user.status === 'active' ? 'suspend' : 'activate')}
                              className={`${user.status === 'active' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'} p-1 rounded`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {user.status === 'active' ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                )}
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">APIエンドポイント監視</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">エンドポイント別統計</h4>
                    <div className="space-y-2">
                      {apiEndpoints.map((endpoint, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <code className="text-sm font-mono text-blue-600">{endpoint.endpoint}</code>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">正常</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">呼び出し数</div>
                              <div className="font-medium">{(endpoint.calls / 1000000).toFixed(1)}M</div>
                            </div>
                            <div>
                              <div className="text-gray-500">平均応答</div>
                              <div className="font-medium">{endpoint.avgTime}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">エラー率</div>
                              <div className="font-medium text-green-600">{endpoint.errorRate}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">リアルタイムメトリクス</h4>
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">現在のQPS</span>
                          <span className="text-2xl font-bold">1,234</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">容量: 45% / 最大 2,750 QPS</div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">データベース接続</span>
                          <span className="text-2xl font-bold">127</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" style={{ width: '32%' }}></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">使用中: 32% / 最大 400接続</div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">メモリ使用量</span>
                          <span className="text-2xl font-bold">8.2GB</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full" style={{ width: '68%' }}></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">使用中: 68% / 合計 12GB</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">APIレート制限違反</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">時刻</th>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">ユーザー</th>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">エンドポイント</th>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">制限値</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="py-2 px-4 text-sm">12:34:56</td>
                        <td className="py-2 px-4 text-sm">user_abc123</td>
                        <td className="py-2 px-4 text-sm font-mono">/api/v1/companies</td>
                        <td className="py-2 px-4 text-sm">100/hour超過</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                  <h4 className="text-sm font-medium text-green-700 mb-2">今月の収益</h4>
                  <div className="text-3xl font-bold text-green-900">¥{stats.monthlyRevenue.toLocaleString()}</div>
                  <div className="text-sm text-green-600 mt-2">前月比 +12.3%</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">年間収益予測</h4>
                  <div className="text-3xl font-bold text-blue-900">¥{(stats.monthlyRevenue * 12).toLocaleString()}</div>
                  <div className="text-sm text-blue-600 mt-2">現在のペース</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                  <h4 className="text-sm font-medium text-purple-700 mb-2">ARPU</h4>
                  <div className="text-3xl font-bold text-purple-900">¥{Math.round(stats.monthlyRevenue / stats.totalUsers).toLocaleString()}</div>
                  <div className="text-sm text-purple-600 mt-2">ユーザーあたり平均収益</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">プラン別収益内訳</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">Pro (¥2,980 × 172人)</span>
                      <span className="text-sm font-medium">¥512,560</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full" style={{ width: '52%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">Standard (¥1,080 × 489人)</span>
                      <span className="text-sm font-medium">¥528,120</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full" style={{ width: '48%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">Free (¥0 × 623人)</span>
                      <span className="text-sm font-medium">¥0</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-gray-400 h-3 rounded-full" style={{ width: '0%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">チャーン率分析</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">月間チャーン率</div>
                    <div className="text-2xl font-bold text-red-600">2.3%</div>
                    <div className="text-xs text-gray-500 mt-1">前月: 2.8%</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">LTV（顧客生涯価値）</div>
                    <div className="text-2xl font-bold text-green-600">¥47,826</div>
                    <div className="text-xs text-gray-500 mt-1">平均継続期間: 44ヶ月</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">システム状態</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Webサーバー</span>
                      <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                    </div>
                    <div className="text-xs text-gray-600">nginx/1.24.0</div>
                    <div className="text-xs text-gray-500">CPU: 23% | Memory: 45%</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">APIサーバー</span>
                      <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                    </div>
                    <div className="text-xs text-gray-600">Node.js v20.10.0</div>
                    <div className="text-xs text-gray-500">CPU: 38% | Memory: 62%</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">データベース</span>
                      <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                    </div>
                    <div className="text-xs text-gray-600">PostgreSQL 15.4</div>
                    <div className="text-xs text-gray-500">Connections: 127/400</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">バックアップ状況</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">タイプ</th>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">最終実行</th>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">サイズ</th>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">ステータス</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="py-2 px-4 text-sm">データベース（完全）</td>
                        <td className="py-2 px-4 text-sm">2024-01-14 03:00</td>
                        <td className="py-2 px-4 text-sm">12.3GB</td>
                        <td className="py-2 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            成功
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="py-2 px-4 text-sm">データベース（増分）</td>
                        <td className="py-2 px-4 text-sm">2024-01-14 12:00</td>
                        <td className="py-2 px-4 text-sm">342MB</td>
                        <td className="py-2 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            成功
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="py-2 px-4 text-sm">ファイルストレージ</td>
                        <td className="py-2 px-4 text-sm">2024-01-14 06:00</td>
                        <td className="py-2 px-4 text-sm">45.6GB</td>
                        <td className="py-2 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            成功
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">メンテナンススケジュール</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <div className="font-medium text-yellow-800">次回メンテナンス予定</div>
                      <div className="text-sm text-yellow-700 mt-1">
                        2024年1月20日 02:00-04:00 JST - システムアップデート（v2.4.0）
                      </div>
                      <button className="text-sm text-yellow-600 hover:underline mt-2">
                        メンテナンス通知を送信
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ユーザー詳細モーダル */}
      {showUserDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">ユーザー詳細</h2>
              <button
                onClick={() => setShowUserDetails(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {(() => {
              const user = users.find(u => u.id === showUserDetails);
              if (!user) return null;
              
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
                      <div className="text-lg">{user.name}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">メール</label>
                      <div className="text-lg">{user.email}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">プラン</label>
                      <div className="text-lg">{user.plan.toUpperCase()}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                      <div className="text-lg">{user.status === 'active' ? 'アクティブ' : '停止中'}</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">API使用状況</label>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold">{user.apiCalls.toLocaleString()} / 月</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(user.apiCalls / 50000) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                      プラン変更
                    </button>
                    <button className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
                      APIキーリセット
                    </button>
                    <button className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">
                      アカウント停止
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}