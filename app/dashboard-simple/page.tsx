'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function SimpleDashboardPage() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    // LocalStorageからAPIキーを取得
    const storedKey = localStorage.getItem('currentApiKey')
    if (storedKey) {
      setApiKey(storedKey)
    }
  }, [])

  const generateApiKey = () => {
    setIsGenerating(true)
    // 簡単なAPIキー生成
    const newKey = `xbrl_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    setApiKey(newKey)
    localStorage.setItem('currentApiKey', newKey)
    setIsGenerating(false)
  }

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey)
      alert('APIキーをコピーしました')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">XBRL API Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">シンプル版（認証不要）</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                ログイン
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                新規登録
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">APIキー管理</h2>
          
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
                <p className="text-sm text-gray-600 mb-2">あなたのAPIキー:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border border-gray-300 font-mono text-sm">
                    {apiKey}
                  </code>
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    コピー
                  </button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">使用方法:</h3>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
{`curl -H "X-API-Key: ${apiKey}" \\
  https://xbrl-api-minimal.vercel.app/api/v1/companies`}
                </pre>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">MCP設定:</h3>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
{`{
  "mcpServers": {
    "xbrl-api": {
      "command": "npx",
      "args": ["@xbrl-jp/mcp-server"],
      "env": {
        "XBRL_API_KEY": "${apiKey}",
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1"
      }
    }
  }
}`}
                </pre>
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  onClick={generateApiKey}
                  className="px-4 py-2 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  新しいキーを生成
                </button>
                <p className="text-sm text-gray-500">
                  ※ このキーはブラウザのローカルストレージに保存されます
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 情報カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">📊 データ量</h3>
            <p className="text-3xl font-bold text-blue-600">4,231社</p>
            <p className="text-sm text-gray-600 mt-1">日本の上場企業</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">📁 ドキュメント</h3>
            <p className="text-3xl font-bold text-green-600">50,000+</p>
            <p className="text-sm text-gray-600 mt-1">財務文書（Markdown形式）</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">🚀 レート制限</h3>
            <p className="text-3xl font-bold text-purple-600">100,000</p>
            <p className="text-sm text-gray-600 mt-1">リクエスト/日（無料プラン）</p>
          </div>
        </div>

        {/* リンク集 */}
        <div className="bg-white shadow rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-gray-900 mb-4">🔗 関連リンク</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/docs" className="text-blue-600 hover:underline">📚 APIドキュメント</a>
            <a href="/examples" className="text-blue-600 hover:underline">💡 使用例</a>
            <a href="https://github.com/ruisu2000p/xbrl-api-minimal" className="text-blue-600 hover:underline">🐙 GitHub</a>
            <a href="/api/health" className="text-blue-600 hover:underline">🩺 ヘルスチェック</a>
          </div>
        </div>
      </main>
    </div>
  )
}