'use client'

import { useState, useEffect } from 'react'
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
  const [copied, setCopied] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const searchCompanies = async () => {
    if (!searchQuery.trim()) return
    
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

  const copyCommand = () => {
    navigator.clipboard.writeText('npx @xbrl-jp/mcp-server')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">X</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  XBRL API
                </span>
                <span className="text-xs font-medium px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full">
                  BETA
                </span>
              </Link>
              <div className="hidden md:flex items-center space-x-6">
                <Link href="/features" className="text-gray-600 hover:text-gray-900 transition-colors">
                  機能
                </Link>
                <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                  料金
                </Link>
                <Link href="/docs" className="text-gray-600 hover:text-gray-900 transition-colors">
                  ドキュメント
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                ログイン
              </Link>
              <Link href="/register" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105">
                無料で始める
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section with Animation */}
        <div className={`text-center py-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-sm font-medium text-amber-800">
                ベータ版提供中 - 早期アクセス特典あり
              </span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              日本企業4,231社の
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              財務データAPI
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            有価証券報告書をプログラマブルに。
            <br />
            Claude Desktop統合でAI分析も簡単に。
          </p>
          
          {/* CTA Buttons with hover effects */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
            <Link href="/register" className="group relative inline-flex items-center justify-center px-8 py-3 overflow-hidden font-semibold text-white transition duration-300 ease-out rounded-lg shadow-xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:scale-105">
              <span className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative">無料トライアル開始</span>
              <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link href="/demo" className="group inline-flex items-center justify-center px-8 py-3 font-semibold text-gray-900 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:scale-105">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              デモを見る
            </Link>
          </div>

          {/* Quick Install with copy animation */}
          <div className="inline-flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-lg">
            <code className="text-sm">npx @xbrl-jp/mcp-server</code>
            <button
              onClick={copyCommand}
              className="ml-2 p-1 hover:bg-gray-700 rounded transition-colors"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Stats with counter animation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { value: '4,231+', label: '対応企業', color: 'from-blue-500 to-blue-600' },
            { value: 'FY2015-24', label: 'データ範囲', color: 'from-green-500 to-green-600' },
            { value: '100,000+', label: '財務文書', color: 'from-purple-500 to-purple-600' },
            { value: '99.9%', label: '稼働率', color: 'from-orange-500 to-orange-600' }
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 hover:scale-105 transform"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}
              </div>
              <div className="text-gray-600 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Interactive Search Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">企業データを検索</h2>
            {companies.length > 0 && (
              <span className="text-sm text-gray-500">{companies.length}件の結果</span>
            )}
          </div>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchCompanies()}
                placeholder="企業名またはティッカーコードを入力（例: トヨタ, 7203）"
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <button
              onClick={searchCompanies}
              disabled={loading || !searchQuery.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>検索中...</span>
                </>
              ) : (
                <>
                  <span>検索</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                  </svg>
                </>
              )}
            </button>
          </div>
          
          {/* Search Results with animation */}
          {companies.length > 0 && (
            <div className="mt-6 space-y-2 max-h-96 overflow-y-auto">
              {companies.slice(0, 10).map((company, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900">{company.name}</div>
                      {company.ticker && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                          {company.ticker}
                        </span>
                      )}
                    </div>
                    {company.available_years && (
                      <div className="text-sm text-gray-500">
                        {company.available_years.length}年分
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features Grid with icons */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            エンタープライズグレードの機能
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '⚡',
                title: '超高速レスポンス',
                description: 'CDN配信とキャッシュ最適化により、平均レスポンス時間100ms以下を実現',
                gradient: 'from-yellow-400 to-orange-400'
              },
              {
                icon: '🤖',
                title: 'AI分析統合',
                description: 'Claude Desktop MCPによる自然言語での財務データ分析とインサイト生成',
                gradient: 'from-purple-400 to-pink-400'
              },
              {
                icon: '📊',
                title: '包括的データセット',
                description: '有価証券報告書、財務諸表、監査報告書など全ての公開情報を網羅',
                gradient: 'from-blue-400 to-cyan-400'
              },
              {
                icon: '🔒',
                title: 'エンタープライズセキュリティ',
                description: 'OAuth 2.0、TLS 1.3暗号化、SOC 2準拠のセキュリティ基準',
                gradient: 'from-green-400 to-teal-400'
              },
              {
                icon: '📈',
                title: 'リアルタイム更新',
                description: 'EDINETと自動同期し、最新の財務情報を即座に反映',
                gradient: 'from-red-400 to-pink-400'
              },
              {
                icon: '🛠️',
                title: '開発者フレンドリー',
                description: 'REST API、SDK、詳細なドキュメント、サンプルコード完備',
                gradient: 'from-indigo-400 to-purple-400'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-gray-100"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`text-4xl mb-4 p-3 bg-gradient-to-br ${feature.gradient} rounded-lg inline-block group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Implementation Steps */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-10 mb-16 text-white">
          <h2 className="text-3xl font-bold text-center mb-10">
            たった4ステップで導入完了
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'サインアップ', desc: '無料アカウント作成' },
              { step: '02', title: 'インストール', desc: 'npm install @xbrl-jp/api' },
              { step: '03', title: 'API設定', desc: 'キーを環境変数に設定' },
              { step: '04', title: '利用開始', desc: 'データ取得開始' }
            ].map((item, index) => (
              <div key={index} className="text-center group">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 group-hover:bg-white/20 transition-all duration-300">
                  <div className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-300">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Cards with better design */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">シンプルな料金プラン</h2>
          <p className="text-center text-gray-600 mb-10">ベータ版期間中は全プラン無料</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Free',
                price: '¥0',
                features: ['直近1年分', '100回/月', '基本サポート'],
                popular: false,
                gradient: 'from-gray-600 to-gray-700'
              },
              {
                name: 'Standard',
                price: '¥1,080',
                features: ['直近3年分', '500回/月', '優先サポート', 'APIキー2個'],
                popular: true,
                gradient: 'from-blue-600 to-indigo-600'
              },
              {
                name: 'Pro',
                price: '¥2,980',
                features: ['全期間無制限', 'API無制限', '専任サポート', 'カスタム統合'],
                popular: false,
                gradient: 'from-purple-600 to-pink-600'
              }
            ].map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-2xl shadow-lg p-8 ${
                  plan.popular ? 'border-2 border-blue-500 scale-105' : 'border border-gray-200'
                } hover:shadow-2xl transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      おすすめ
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className={`text-4xl font-bold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                    {plan.price}
                  </span>
                  <span className="text-gray-500 text-sm">/月</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm">
                      <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {plan.popular ? '今すぐ始める' : '選択する'}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section with gradient */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-12 text-center text-white mb-16">
          <h2 className="text-4xl font-bold mb-4">
            今すぐ財務データAPIを体験
          </h2>
          <p className="text-xl mb-8 opacity-90">
            ベータ版期間中は全機能が無料。クレジットカード不要。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              無料アカウント作成
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
              </svg>
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center px-8 py-4 bg-transparent text-white rounded-lg font-semibold border-2 border-white hover:bg-white hover:text-blue-600 transition-all duration-200"
            >
              ドキュメントを見る
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-12 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4 text-gray-900">プロダクト</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/features" className="hover:text-blue-600 transition-colors">機能</Link></li>
                <li><Link href="/pricing" className="hover:text-blue-600 transition-colors">料金</Link></li>
                <li><Link href="/docs" className="hover:text-blue-600 transition-colors">ドキュメント</Link></li>
                <li><Link href="/api" className="hover:text-blue-600 transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-900">会社</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/about" className="hover:text-blue-600 transition-colors">会社概要</Link></li>
                <li><Link href="/blog" className="hover:text-blue-600 transition-colors">ブログ</Link></li>
                <li><Link href="/careers" className="hover:text-blue-600 transition-colors">採用</Link></li>
                <li><Link href="/contact" className="hover:text-blue-600 transition-colors">お問い合わせ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-900">リソース</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/guides" className="hover:text-blue-600 transition-colors">ガイド</Link></li>
                <li><Link href="/tutorials" className="hover:text-blue-600 transition-colors">チュートリアル</Link></li>
                <li><Link href="/changelog" className="hover:text-blue-600 transition-colors">更新履歴</Link></li>
                <li><Link href="/status" className="hover:text-blue-600 transition-colors">ステータス</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-900">法的情報</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/privacy" className="hover:text-blue-600 transition-colors">プライバシー</Link></li>
                <li><Link href="/terms" className="hover:text-blue-600 transition-colors">利用規約</Link></li>
                <li><Link href="/security" className="hover:text-blue-600 transition-colors">セキュリティ</Link></li>
                <li><Link href="/compliance" className="hover:text-blue-600 transition-colors">コンプライアンス</Link></li>
              </ul>
            </div>
          </div>
          <div className="text-center pt-8 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              © 2025 XBRL Financial Data API - Beta Version
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Built with Next.js & Supabase | Powered by AI
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}