'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function RegisterSuccess() {
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    // Generate a mock API key
    const generateApiKey = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      let key = 'xbrl_'
      for (let i = 0; i < 32; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return key
    }
    setApiKey(generateApiKey())
  }, [])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey)
    // You could add a toast notification here
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              XBRL API <span className="text-sm text-blue-600 ml-2 px-2 py-1 bg-blue-100 rounded">BETA</span>
            </Link>
            <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              ダッシュボードへ
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          {/* Success Message */}
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              登録が完了しました！
            </h2>
            
            <p className="text-gray-600 mb-8">
              XBRL Financial Data APIへようこそ。<br />
              以下のAPIキーを使用してすぐに開発を始められます。
            </p>

            {/* API Key Display */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">あなたのAPIキー</h3>
              <div className="flex items-center justify-between bg-white border border-gray-300 rounded-lg px-4 py-3">
                <code className="text-sm font-mono text-gray-900 break-all">
                  {apiKey}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="ml-4 flex-shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm"
                >
                  コピー
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                ⚠️ このAPIキーは一度だけ表示されます。安全な場所に保管してください。
              </p>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
              <h3 className="font-semibold text-blue-900 mb-3">次のステップ</h3>
              <ol className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start">
                  <span className="font-semibold mr-2">1.</span>
                  <span>
                    <Link href="/docs/quickstart" className="underline hover:text-blue-900">
                      クイックスタートガイド
                    </Link>
                    を読んで基本的な使い方を学ぶ
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">2.</span>
                  <span>
                    <code className="bg-white px-2 py-1 rounded text-xs">npm install @xbrl-jp/api</code>
                    でSDKをインストール
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">3.</span>
                  <span>
                    <Link href="/docs/mcp-setup" className="underline hover:text-blue-900">
                      Claude Desktop MCP設定
                    </Link>
                    でAI統合を有効化
                  </span>
                </li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Link
                href="/dashboard"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                ダッシュボードへ進む
              </Link>
              <Link
                href="/docs"
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors"
              >
                ドキュメントを見る
              </Link>
            </div>
          </div>

          {/* Additional Resources */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-2xl mb-3">📚</div>
              <h3 className="font-semibold mb-2">ドキュメント</h3>
              <p className="text-sm text-gray-600 mb-3">
                API仕様、サンプルコード、ベストプラクティス
              </p>
              <Link href="/docs" className="text-sm text-blue-600 hover:text-blue-700">
                詳しく見る →
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-2xl mb-3">💬</div>
              <h3 className="font-semibold mb-2">サポート</h3>
              <p className="text-sm text-gray-600 mb-3">
                技術的な質問やトラブルシューティング
              </p>
              <Link href="/support" className="text-sm text-blue-600 hover:text-blue-700">
                ヘルプセンター →
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-2xl mb-3">🚀</div>
              <h3 className="font-semibold mb-2">スタートガイド</h3>
              <p className="text-sm text-gray-600 mb-3">
                5分で最初のAPIコールを実行
              </p>
              <Link href="/quickstart" className="text-sm text-blue-600 hover:text-blue-700">
                今すぐ始める →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}