'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/app/actions/auth'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  key_suffix: string
  created_at: string
  last_used_at: string | null
  is_active: boolean
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

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">APIキー一覧</h2>
          {apiKeys.length > 0 ? (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{key.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {key.key_prefix}...{key.key_suffix}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      作成日: {new Date(key.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 border border-red-300 rounded-md"
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">📊 企業数</h3>
            <p className="text-3xl font-bold text-blue-600">4,231</p>
            <p className="text-sm text-gray-600 mt-1">日本の上場企業</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">📁 ドキュメント</h3>
            <p className="text-3xl font-bold text-blue-600">50,000+</p>
            <p className="text-sm text-gray-600 mt-1">財務文書</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">🚀 レート制限</h3>
            <p className="text-3xl font-bold text-blue-600">100,000</p>
            <p className="text-sm text-gray-600 mt-1">リクエスト/日</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">📈 年度範囲</h3>
            <p className="text-3xl font-bold text-blue-600">2015-2025</p>
            <p className="text-sm text-gray-600 mt-1">利用可能データ</p>
          </div>
        </div>
      </main>
    </div>
  )
}