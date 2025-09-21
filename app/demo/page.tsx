import React from 'react'
import VideoPlayer from '@/components/VideoPlayer'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">
            XBRL Financial API デモンストレーション
          </h1>

          <p className="text-lg text-gray-600 text-center mb-8">
            新しいAPIキーシステムとデータアクセス機能をご覧ください
          </p>

          {/* 動画プレーヤーセクション */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">ライブデモ</h2>

            {/* ローカルの動画ファイルを使用 */}
            <VideoPlayer
              videoUrl="/videos/demo.mp4"
              autoPlay={false}
              controls={true}
              muted={true}
            />
          </div>

          {/* 機能説明セクション */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">
                🔐 セキュアなAPIキー管理
              </h3>
              <p className="text-gray-600">
                新しいv1フォーマットでUUIDベースの安全な認証システム
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-3 text-green-600">
                📊 リアルタイム財務データ
              </h3>
              <p className="text-gray-600">
                FY2022-2025の日本企業財務データへの即座アクセス
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-3 text-purple-600">
                🤖 Claude MCP統合
              </h3>
              <p className="text-gray-600">
                Model Context Protocolによる高度なAI分析機能
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-3 text-orange-600">
                ⚡ 高速レスポンス
              </h3>
              <p className="text-gray-600">
                Supabase Edge Functionsによる低レイテンシー処理
              </p>
            </div>
          </div>

          {/* CTAセクション */}
          <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">
              今すぐ始めましょう
            </h2>
            <p className="mb-6">
              無料アカウントを作成して、財務データAPIを体験してください
            </p>
            <div className="space-x-4">
              <a
                href="/auth/register"
                className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                無料で始める
              </a>
              <a
                href="/docs"
                className="inline-block border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition"
              >
                ドキュメントを見る
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}