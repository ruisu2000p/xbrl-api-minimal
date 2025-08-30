'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Company {
  name: string
  ticker?: string
  company_id?: string
  available_years?: string[]
}

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const searchCompanies = async () => {
    if (!searchQuery) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/companies?search=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      setCompanies(data.companies || [])
    } catch (error) {
      console.error('Error searching companies:', error)
    } finally {
      setLoading(false)
    }
  }

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
              <Link href="/features" className="text-gray-700 hover:text-gray-900">
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
          <div className="inline-flex items-center mb-4 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            ベータ版提供中 - 早期アクセス特典あり
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            日本企業の財務データに
            <br />
            <span className="text-blue-600">簡単アクセス</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            4,231社以上の有価証券報告書をAPIで取得。
            Claude Desktopとの統合により、AIを活用した財務分析が可能に。
          </p>
          
          {/* CTA Buttons */}
          <div className="flex justify-center gap-4 mb-8">
            <Link href="/register" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors">
              無料トライアル開始
            </Link>
            <Link href="/demo" className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors">
              デモを見る
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-3xl font-bold text-blue-600">4,231+</div>
              <div className="text-gray-600">対応企業数</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-3xl font-bold text-green-600">FY2015-24</div>
              <div className="text-gray-600">データ範囲</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-3xl font-bold text-purple-600">100,000+</div>
              <div className="text-gray-600">財務文書</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-3xl font-bold text-orange-600">99.9%</div>
              <div className="text-gray-600">稼働率</div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-12">
          <h2 className="text-2xl font-semibold mb-4">企業データを検索</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchCompanies()}
              placeholder="企業名またはティッカーコードを入力（例: トヨタ, 7203）"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={searchCompanies}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? '検索中...' : '検索'}
            </button>
          </div>
          
          {/* Search Results */}
          {companies.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">検索結果</h3>
              <div className="space-y-2">
                {companies.slice(0, 10).map((company, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div className="font-semibold">{company.name}</div>
                    {company.ticker && (
                      <span className="text-sm text-gray-600">コード: {company.ticker}</span>
                    )}
                    {company.available_years && (
                      <div className="text-sm text-gray-500">
                        利用可能年度: {company.available_years.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Key Features */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">主要機能</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="text-lg font-semibold mb-2">高速API</h3>
              <p className="text-gray-600">
                RESTful APIで企業の財務データに即座にアクセス。レスポンス時間は平均100ms以下。
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold mb-2">AI統合</h3>
              <p className="text-gray-600">
                Claude Desktop MCP対応。自然言語で財務データを分析・比較可能。
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2">包括的データ</h3>
              <p className="text-gray-600">
                有価証券報告書、財務諸表、監査報告書など、全ての公開財務情報を網羅。
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="text-lg font-semibold mb-2">セキュア</h3>
              <p className="text-gray-600">
                エンタープライズグレードのセキュリティ。OAuth 2.0認証とSSL暗号化。
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">📈</div>
              <h3 className="text-lg font-semibold mb-2">リアルタイム更新</h3>
              <p className="text-gray-600">
                EDINETと連携し、最新の財務情報を自動的に取得・更新。
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">💡</div>
              <h3 className="text-lg font-semibold mb-2">簡単導入</h3>
              <p className="text-gray-600">
                npm installで即座に利用開始。詳細なドキュメントとサンプルコード付き。
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">導入ステップ</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">アカウント作成</h3>
              <p className="text-sm text-gray-600">無料で登録し、APIキーを取得</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">パッケージインストール</h3>
              <p className="text-sm text-gray-600">npm install @xbrl-jp/api</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">APIキー設定</h3>
              <p className="text-sm text-gray-600">環境変数にAPIキーを設定</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h3 className="font-semibold mb-2">利用開始</h3>
              <p className="text-sm text-gray-600">APIを呼び出してデータ取得</p>
            </div>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">料金プラン</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
              <h3 className="text-xl font-semibold mb-2">Free</h3>
              <div className="text-3xl font-bold mb-4">¥0<span className="text-sm text-gray-500">/月</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  直近1年分のデータ
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  100回/月のAPI呼び出し
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  基本サポート
                </li>
              </ul>
              <Link href="/register" className="block text-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
                無料で始める
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs">
                人気
              </div>
              <h3 className="text-xl font-semibold mb-2">Standard</h3>
              <div className="text-3xl font-bold mb-4">¥1,080<span className="text-sm text-gray-500">/月</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  直近3年分のデータ
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  500回/月のAPI呼び出し
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  優先サポート
                </li>
              </ul>
              <Link href="/register" className="block text-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                今すぐ始める
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
              <h3 className="text-xl font-semibold mb-2">Pro</h3>
              <div className="text-3xl font-bold mb-4">¥2,980<span className="text-sm text-gray-500">/月</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  全期間データ無制限
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  API呼び出し無制限
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  専任サポート
                </li>
              </ul>
              <Link href="/register" className="block text-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
                お問い合わせ
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">プロダクト</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/features" className="hover:text-gray-900">機能</Link></li>
                <li><Link href="/pricing" className="hover:text-gray-900">料金</Link></li>
                <li><Link href="/docs" className="hover:text-gray-900">ドキュメント</Link></li>
                <li><Link href="/api" className="hover:text-gray-900">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">会社</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/about" className="hover:text-gray-900">会社概要</Link></li>
                <li><Link href="/blog" className="hover:text-gray-900">ブログ</Link></li>
                <li><Link href="/careers" className="hover:text-gray-900">採用</Link></li>
                <li><Link href="/contact" className="hover:text-gray-900">お問い合わせ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">リソース</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/guides" className="hover:text-gray-900">ガイド</Link></li>
                <li><Link href="/tutorials" className="hover:text-gray-900">チュートリアル</Link></li>
                <li><Link href="/changelog" className="hover:text-gray-900">更新履歴</Link></li>
                <li><Link href="/status" className="hover:text-gray-900">ステータス</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">法的情報</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/privacy" className="hover:text-gray-900">プライバシー</Link></li>
                <li><Link href="/terms" className="hover:text-gray-900">利用規約</Link></li>
                <li><Link href="/security" className="hover:text-gray-900">セキュリティ</Link></li>
                <li><Link href="/compliance" className="hover:text-gray-900">コンプライアンス</Link></li>
              </ul>
            </div>
          </div>
          <div className="text-center text-gray-600 text-sm">
            <p>© 2025 XBRL Financial Data API - Beta Version</p>
            <p className="mt-2">Built with Next.js & Supabase</p>
          </div>
        </footer>
      </div>
    </div>
  )
}