'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import dynamic from 'next/dynamic'

const ApiUsageStats = dynamic(() => import('@/components/ApiUsageStats'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded"></div>
})

interface ApiKey {
  id: string
  name: string
  description?: string
  status: string
  tier?: string
  created_at: string
  last_used_at: string | null
  key_hash: string
  expires_at?: string | null
}

interface DashboardClientProps {
  user: {
    id: string
    email: string
    name?: string
    company?: string | null
  }
  apiKeys: ApiKey[]
}

export default function DashboardClient({ user, apiKeys }: DashboardClientProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [keyDescription, setKeyDescription] = useState('')
  const [error, setError] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [showKeyModal, setShowKeyModal] = useState(false)

  const handleGenerateKey = async () => {
    if (!keyName) {
      setError('APIキー名を入力してください')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/dashboard/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: keyName,
          description: keyDescription,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.apiKey) {
          setGeneratedKey(data.apiKey)
          setShowKeyModal(true)
        }
        setKeyName('')
        setKeyDescription('')
        router.refresh()
      } else {
        const data = await response.json()
        setError(data.error || 'APIキーの生成に失敗しました')
      }
    } catch (err) {
      setError('エラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('このAPIキーを削除してもよろしいですか？')) {
      return
    }

    try {
      const response = await fetch(`/api/dashboard/api-keys/${keyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* APIキー表示モーダル */}
      {showKeyModal && generatedKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-lg font-semibold mb-4">APIキーが生成されました</h3>
            <p className="text-sm text-red-600 mb-4">
              ⚠️ このAPIキーは二度と表示されません。今すぐ安全な場所にコピーしてください。
            </p>
            <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all mb-4">
              {generatedKey}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey)
                  alert('APIキーをクリップボードにコピーしました')
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                コピー
              </button>
              <button
                onClick={() => {
                  setShowKeyModal(false)
                  setGeneratedKey(null)
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">XBRL API Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">APIキー管理</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">新しいAPIキーを生成</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="APIキー名（例：本番用キー）"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <textarea
                placeholder="説明（オプション）"
                value={keyDescription}
                onChange={(e) => setKeyDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
            <button
              onClick={handleGenerateKey}
              disabled={isGenerating}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isGenerating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isGenerating ? '生成中...' : 'APIキーを生成'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">APIキー一覧</h2>
            <button
              onClick={() => router.push('/dashboard/test-mcp')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
            >
              MCPテスト
            </button>
          </div>
          {apiKeys.length > 0 ? (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="border border-gray-200 rounded-lg p-4 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{key.name}</p>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        key.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {key.status === 'active' ? '有効' : '無効'}
                      </span>
                      {key.tier && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                          {key.tier}
                        </span>
                      )}
                    </div>
                    {key.description && (
                      <p className="text-sm text-gray-600 mt-1">{key.description}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2 font-mono">
                      ID: {key.id.substring(0, 8)}...{key.id.substring(key.id.length - 4)}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>作成日: {new Date(key.created_at).toLocaleDateString('ja-JP')}</span>
                      {key.last_used_at && (
                        <span>最終使用: {new Date(key.last_used_at).toLocaleDateString('ja-JP')}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 border border-red-300 rounded-md"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              <p>まだAPIキーがありません</p>
              <p className="mt-2 text-sm">上のボタンから新しいキーを生成してください</p>
            </div>
          )}
        </div>

        {/* MCP接続案内 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">🔌 MCP (Model Context Protocol) 接続</h2>
          <div className="space-y-3 text-sm text-blue-800">
            <p>Claude DesktopからこのAPIに接続して、財務データを直接取得できます。</p>

            <div className="bg-white rounded p-4 border border-blue-200">
              <p className="font-semibold mb-2">設定手順:</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Claude Desktopの設定ファイルを開く</li>
                <li>以下のMCPサーバー設定を追加:</li>
              </ol>

              <div className="mt-3 bg-gray-100 p-3 rounded font-mono text-xs overflow-x-auto">
                <pre>{`{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal"],
      "env": {
        "XBRL_API_KEY": "あなたのAPIキー",
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1"
      }
    }
  }
}`}</pre>
              </div>
            </div>

            <div className="mt-4">
              <p className="font-semibold mb-2">利用可能な機能:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>企業検索（4,231社）</li>
                <li>財務データ取得（売上高、利益、キャッシュフロー等）</li>
                <li>有価証券報告書の全文検索</li>
                <li>年度別データ比較（2015-2025年）</li>
              </ul>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}