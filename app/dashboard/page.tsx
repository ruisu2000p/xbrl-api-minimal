'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ユーザー情報の取得（オプション）
    const checkUser = async () => {
      try {
        // LocalStorageから基本情報を取得
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }
        
        // APIキー一覧を取得
        await fetchApiKeys()
      } catch (error) {
        console.error('Init error:', error)
      } finally {
        setLoading(false)
      }
    }
    
    checkUser()
  }, [])

  const fetchApiKeys = async () => {
    try {
      // LocalStorageから取得
      const storedKeys = localStorage.getItem('apiKeys')
      if (storedKeys) {
        setApiKeys(JSON.parse(storedKeys))
      }
      
      // APIからも取得を試みる
      try {
        const response = await fetch('/api/apikeys/generate')
        const data = await response.json()
        if (data.success && data.data) {
          // APIからのデータとマージ
          const localKeys = JSON.parse(localStorage.getItem('apiKeys') || '[]')
          const mergedKeys = [...data.data, ...localKeys.filter((k: any) => 
            !data.data.some((d: any) => d.id === k.id)
          )]
          setApiKeys(mergedKeys)
        }
      } catch {
        // APIエラーは無視（LocalStorageのみ使用）
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    }
  }

  const generateApiKey = async () => {
    setError(null)
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/apikeys/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newKeyName || 'My API Key',
          email: user?.email || 'user@example.com'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setGeneratedKey(data.data.key)
        setShowKeyModal(true)
        setNewKeyName('')
        
        // LocalStorageに保存
        const existingKeys = JSON.parse(localStorage.getItem('apiKeys') || '[]')
        existingKeys.unshift({
          ...data.data,
          key_preview: data.data.key_preview || `${data.data.key.substring(0, 16)}...${data.data.key.slice(-4)}`
        })
        localStorage.setItem('apiKeys', JSON.stringify(existingKeys))
        
        // リストを更新
        fetchApiKeys()
      } else {
        setError(data.error || 'APIキーの生成に失敗しました')
      }
    } catch (error) {
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

  const deleteApiKey = (keyId: string) => {
    if (confirm('このAPIキーを削除してもよろしいですか？')) {
      const keys = JSON.parse(localStorage.getItem('apiKeys') || '[]')
      const filtered = keys.filter((k: any) => k.id !== keyId)
      localStorage.setItem('apiKeys', JSON.stringify(filtered))
      setApiKeys(filtered)
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

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="APIキー名（オプション）"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={generateApiKey}
              disabled={isGenerating}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{key.name}</h3>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          key.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {key.status === 'active' ? 'アクティブ' : '無効'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {key.key_preview || key.key?.substring(0, 20) + '...'}
                        </code>
                        <button
                          onClick={() => copyToClipboard(key.key || key.key_preview)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          コピー
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        作成日: {new Date(key.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteApiKey(key.id)}
                      className="text-red-600 hover:text-red-800"
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