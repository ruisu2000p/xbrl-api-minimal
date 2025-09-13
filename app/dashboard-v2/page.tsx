'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardV2Page() {
  const router = useRouter()
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/apikeys/generate')
      const data = await response.json()
      if (data.success) {
        setApiKeys(data.data || [])
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
          email: localStorage.getItem('userEmail') || 'user@example.com'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setGeneratedKey(data.data.key)
        setShowKeyModal(true)
        setNewKeyName('')
        
        // ローカルストレージに保存（オプション）
        const existingKeys = JSON.parse(localStorage.getItem('apiKeys') || '[]')
        existingKeys.push({
          ...data.data,
          key: data.data.key.substring(0, 16) + '...' // 部分的に保存
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
    navigator.clipboard.writeText(text)
    alert('APIキーをコピーしました')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">XBRL API Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">APIキー管理</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/docs"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                APIドキュメント
              </Link>
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                ホーム
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
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">APIキー一覧</h2>
          
          {apiKeys.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              まだAPIキーがありません。上のボタンから新しいキーを生成してください。
            </p>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{key.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        キー: <code className="bg-gray-100 px-2 py-1 rounded">{key.key_preview}</code>
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        作成日: {new Date(key.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        key.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {key.status === 'active' ? 'アクティブ' : '無効'}
                      </span>
                      {key.usage && (
                        <div className="mt-2 text-xs text-gray-500">
                          今日: {key.usage.today}回<br/>
                          今月: {key.usage.this_month}回
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 情報カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">📊 レート制限</h3>
            <p className="text-2xl font-bold text-blue-600">100,000</p>
            <p className="text-sm text-gray-600 mt-1">リクエスト/日</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">🏢 対応企業数</h3>
            <p className="text-2xl font-bold text-green-600">4,231</p>
            <p className="text-sm text-gray-600 mt-1">日本の上場企業</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">📁 データ量</h3>
            <p className="text-2xl font-bold text-purple-600">50,000+</p>
            <p className="text-sm text-gray-600 mt-1">財務文書</p>
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