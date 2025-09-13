'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function DashboardTestPage() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)

  useEffect(() => {
    // LocalStorageから既存のAPIキーを取得
    const storedKey = localStorage.getItem('testApiKey')
    if (storedKey) {
      setApiKey(storedKey)
    }
  }, [])

  const generateApiKey = async () => {
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/apikeys/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test API Key',
          email: 'test@example.com'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setGeneratedKey(data.data.key)
        setApiKey(data.data.key)
        setShowKeyModal(true)
        
        // LocalStorageに保存
        localStorage.setItem('testApiKey', data.data.key)
      }
    } catch (error) {
      console.error('APIキー生成エラー:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // 通知を表示
    const notification = document.createElement('div')
    notification.textContent = 'コピーしました！'
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50'
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">XBRL API Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">テスト版（認証不要）</p>
            </div>
            <div className="flex gap-4">
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
          <h2 className="text-xl font-bold text-gray-900 mb-4">APIキー管理</h2>
          
          {!apiKey ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">APIキーをまだ生成していません</p>
              <button
                onClick={generateApiKey}
                disabled={isGenerating}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isGenerating ? '生成中...' : 'APIキーを生成'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600 mb-2">現在のAPIキー:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border border-gray-300 font-mono text-sm">
                    {apiKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(apiKey)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    コピー
                  </button>
                </div>
              </div>

              <div className="border-t pt-4">
                <button
                  onClick={generateApiKey}
                  disabled={isGenerating}
                  className="px-4 py-2 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isGenerating ? '生成中...' : '新しいキーを生成'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 使用方法 */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">使用方法</h2>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
{`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  https://xbrl-api-minimal.vercel.app/api/v1/companies`}
          </pre>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </div>
      </main>

      {/* APIキー表示モーダル */}
      {showKeyModal && generatedKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">APIキーが生成されました</h3>
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-4">
              <p className="text-sm text-yellow-800 mb-2">
                ⚠️ このAPIキーは安全な場所に保管してください。
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