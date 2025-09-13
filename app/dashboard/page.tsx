'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyDescription, setNewKeyDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Supabase認証状態の確認とAPIキー取得
    const initializeDashboard = async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !authUser) {
          router.push('/login')
          return
        }
        
        setUser(authUser)
        await fetchApiKeys()
      } catch (error) {
        console.error('Dashboard initialization error:', error)
        setError('ダッシュボードの初期化に失敗しました')
      } finally {
        setLoading(false)
      }
    }
    
    initializeDashboard()
  }, [router])

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/dashboard/api-keys', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.apiKeys) {
        setApiKeys(data.apiKeys)
      } else {
        setApiKeys([])
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
      setError('APIキーの取得に失敗しました')
    }
  }

  const generateApiKey = async () => {
    setError(null)
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/dashboard/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newKeyName || 'My API Key',
          description: newKeyDescription || 'API key generated from dashboard',
          tier: 'free'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.apiKey) {
        setGeneratedKey(data.apiKey)
        setShowKeyModal(true)
        setNewKeyName('')
        setNewKeyDescription('')
        
        // リストを更新
        await fetchApiKeys()
      } else {
        setError(data.error || 'APIキーの生成に失敗しました')
      }
    } catch (error) {
      console.error('Generate API key error:', error)
      setError('APIキーの生成中にエラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // 一時的な通知を表示
      const notification = document.createElement('div')
      notification.textContent = 'コピーしました！'
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50'
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 2000)
    })
  }

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('このAPIキーを削除してもよろしいですか？')) {
      return
    }
    
    try {
      const response = await fetch(`/api/dashboard/api-keys?id=${keyId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.message) {
        // 成功：リストを更新
        await fetchApiKeys()
      } else {
        setError(data.error || 'APIキーの削除に失敗しました')
      }
    } catch (error) {
      console.error('Delete API key error:', error)
      setError('APIキーの削除中にエラーが発生しました')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">XBRL API Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                {user?.email || 'APIキー管理'}
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/docs"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                APIドキュメント
              </Link>
              <Link
                href="/auth/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                ログイン
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* APIキー生成セクション */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">新しいAPIキーを生成</h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="APIキー名（例：本番用キー）"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="説明（オプション）"
                value={newKeyDescription}
                onChange={(e) => setNewKeyDescription(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={generateApiKey}
              disabled={isGenerating}
              className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? '生成中...' : 'APIキーを生成'}
            </button>
          </div>
        </div>

        {/* 既存のAPIキー一覧 */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">APIキー一覧</h2>
          
          {apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                まだAPIキーがありません
              </p>
              <p className="text-sm text-gray-400">
                上のボタンから新しいキーを生成してください
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{key.name}</h3>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          key.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {key.status === 'active' ? 'アクティブ' : key.status === 'revoked' ? '無効' : key.status}
                        </span>
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {key.tier || 'free'}
                        </span>
                      </div>
                      
                      {key.description && (
                        <p className="text-sm text-gray-600 mb-2">{key.description}</p>
                      )}
                      
                      <div className="flex items-center gap-2 mb-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {key.key_preview || `${key.name?.substring(0, 10)}...`}
                        </code>
                        <button
                          onClick={() => copyToClipboard(key.key_preview || key.name || '')}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          コピー
                        </button>
                      </div>
                      
                      <div className="text-xs text-gray-400 space-y-1">
                        <p>作成日: {new Date(key.created_at).toLocaleDateString('ja-JP')}</p>
                        {key.last_used_at && (
                          <p>最終使用: {new Date(key.last_used_at).toLocaleDateString('ja-JP')}</p>
                        )}
                        {key.expires_at && (
                          <p>有効期限: {new Date(key.expires_at).toLocaleDateString('ja-JP')}</p>
                        )}
                      </div>
                      
                      {key.api_key_rate_limits && (
                        <div className="mt-2 text-xs text-gray-500">
                          <p>制限: {key.api_key_rate_limits.requests_per_hour}/時間, {key.api_key_rate_limits.requests_per_day}/日</p>
                          <p>使用量: {key.api_key_rate_limits.current_hour_count}/{key.api_key_rate_limits.requests_per_hour} (今時間)</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteApiKey(key.id)}
                      className="text-red-600 hover:text-red-800 ml-4"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 使用方法 */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">使用方法</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">cURL コマンド例:</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
{`curl -H "X-API-Key: YOUR_API_KEY" \\
  https://xbrl-api-minimal.vercel.app/api/v1/companies`}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">MCP Server 設定:</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
{`{
  "mcpServers": {
    "xbrl-api": {
      "command": "npx",
      "args": ["@xbrl-jp/mcp-server"],
      "env": {
        "XBRL_API_KEY": "YOUR_API_KEY",
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1"
      }
    }
  }
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">📊 企業数</h3>
            <p className="text-3xl font-bold text-blue-600">4,231</p>
            <p className="text-sm text-gray-600 mt-1">日本の上場企業</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">📁 ドキュメント</h3>
            <p className="text-3xl font-bold text-green-600">50,000+</p>
            <p className="text-sm text-gray-600 mt-1">財務文書</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">🚀 レート制限</h3>
            <p className="text-3xl font-bold text-purple-600">100,000</p>
            <p className="text-sm text-gray-600 mt-1">リクエスト/日</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">📈 年度範囲</h3>
            <p className="text-3xl font-bold text-orange-600">2015-2025</p>
            <p className="text-sm text-gray-600 mt-1">利用可能データ</p>
          </div>
        </div>
      </main>

      {/* APIキー表示モーダル */}
      {showKeyModal && generatedKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">APIキーが生成されました</h3>
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-4">
              <p className="text-sm text-yellow-800 mb-2">
                ⚠️ このAPIキーは二度と表示されません。必ず安全な場所にコピーして保管してください。
              </p>
            </div>
            <div className="bg-gray-100 p-4 rounded-md mb-4">
              <code className="text-sm break-all">{generatedKey}</code>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(generatedKey)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                コピー
              </button>
              <button
                onClick={() => {
                  setShowKeyModal(false)
                  setGeneratedKey(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}