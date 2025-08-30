'use client'

import Link from 'next/link'

export default function Features() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900">
                XBRL API <span className="text-sm text-blue-600 ml-2 px-2 py-1 bg-blue-100 rounded">BETA</span>
              </Link>
              <Link href="/features" className="text-blue-600 font-semibold">
                機能詳細
              </Link>
              <Link href="/pricing" className="text-gray-700 hover:text-gray-900">
                料金プラン
              </Link>
              <Link href="/docs" className="text-gray-700 hover:text-gray-900">
                ドキュメント
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-700 hover:text-gray-900">
                ログイン
              </Link>
              <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                無料で始める
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            強力な機能で財務分析を革新
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            XBRL Financial Data APIは、日本企業の財務データへのアクセスを簡単にし、
            AIを活用した高度な分析を可能にします。
          </p>
        </div>

        {/* Core Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">コア機能</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
                <h3 className="text-2xl font-bold text-white">RESTful API</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  シンプルで直感的なRESTful APIを通じて、4,231社以上の財務データに即座にアクセス。
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">企業検索エンドポイント</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">財務データ取得API</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">時系列データ分析</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">バッチ処理対応</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
                <h3 className="text-2xl font-bold text-white">Claude Desktop MCP統合</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Model Context Protocolを使用してClaude Desktopと完全統合。自然言語で財務データを分析。
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">自然言語クエリ</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">比較分析機能</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">インサイト生成</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">レポート自動生成</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-6">
                <h3 className="text-2xl font-bold text-white">包括的データカバレッジ</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  EDINETから取得した正確で信頼性の高い財務データを提供。
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">有価証券報告書</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">財務諸表（BS/PL/CF）</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">監査報告書</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">セグメント情報</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
                <h3 className="text-2xl font-bold text-white">高速パフォーマンス</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Supabaseの強力なインフラストラクチャで、高速で安定したサービスを提供。
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">平均レスポンス時間 &lt;100ms</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">99.9%の稼働率</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">CDNによる配信</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">自動スケーリング</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specs */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold mb-8">技術仕様</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">データフォーマット</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• JSON形式でのレスポンス</li>
                <li>• UTF-8エンコーディング</li>
                <li>• ISO 8601日付フォーマット</li>
                <li>• 圧縮転送（gzip）対応</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">認証・セキュリティ</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• APIキーベース認証</li>
                <li>• HTTPS/TLS 1.3暗号化</li>
                <li>• レート制限機能</li>
                <li>• IPホワイトリスト（Proプラン）</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">SDK & ライブラリ</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Node.js/TypeScript SDK</li>
                <li>• Python クライアント</li>
                <li>• React hooks</li>
                <li>• MCP Server統合</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">対応環境</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Node.js 16+</li>
                <li>• Python 3.8+</li>
                <li>• Claude Desktop</li>
                <li>• すべてのモダンブラウザ</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">活用事例</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="font-semibold text-lg mb-2">投資分析</h3>
              <p className="text-gray-600 text-sm">
                複数企業の財務データを比較分析し、投資判断に必要な情報を迅速に取得。
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="font-semibold text-lg mb-2">AIレポート生成</h3>
              <p className="text-gray-600 text-sm">
                Claude Desktopと連携して、財務レポートを自動生成。
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-3xl mb-4">📈</div>
              <h3 className="font-semibold text-lg mb-2">トレンド分析</h3>
              <p className="text-gray-600 text-sm">
                時系列データを活用した業界トレンドの把握と予測。
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-3xl mb-4">🔍</div>
              <h3 className="font-semibold text-lg mb-2">デューデリジェンス</h3>
              <p className="text-gray-600 text-sm">
                M&Aや投資前の企業調査を効率化。
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-3xl mb-4">📱</div>
              <h3 className="font-semibold text-lg mb-2">FinTechアプリ</h3>
              <p className="text-gray-600 text-sm">
                財務データを活用した新しいサービスの構築。
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-3xl mb-4">🎓</div>
              <h3 className="font-semibold text-lg mb-2">研究・教育</h3>
              <p className="text-gray-600 text-sm">
                アカデミックな研究や教育目的での利用。
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            今すぐ始めましょう
          </h2>
          <p className="text-xl mb-8 opacity-90">
            ベータ版期間中は全機能が無料でお試しいただけます
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              無料で始める
            </Link>
            <Link
              href="/docs"
              className="bg-transparent text-white px-8 py-3 rounded-lg font-semibold border-2 border-white hover:bg-white hover:text-blue-600 transition-colors"
            >
              ドキュメントを見る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}