'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [companies, setCompanies] = useState([])
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
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            XBRL Financial Data API
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            日本企業の財務データにアクセス - Powered by Supabase
          </p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-3xl font-bold text-blue-600">4,231+</div>
              <div className="text-gray-600">企業データ</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-3xl font-bold text-green-600">FY2015-2024</div>
              <div className="text-gray-600">対応年度</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-3xl font-bold text-purple-600">100,000+</div>
              <div className="text-gray-600">財務文書</div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">企業検索</h2>
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
                  <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
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

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2">📊 財務データAPI</h3>
            <p className="text-gray-600">
              有価証券報告書、財務諸表、監査報告書など包括的な財務データへのアクセス
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2">🔌 MCP Server統合</h3>
            <p className="text-gray-600">
              Claude DesktopやAIアプリケーションとのシームレスな統合
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2">☁️ Supabase基盤</h3>
            <p className="text-gray-600">
              高速で信頼性の高いクラウドインフラストラクチャー
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="text-center">
          <div className="flex justify-center gap-4">
            <a
              href="https://github.com/ruisu2000p/xbrl-api-minimal"
              className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Repository
            </a>
            <a
              href="/api/companies"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              API Endpoint
            </a>
            <a
              href="https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo"
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Supabase Dashboard
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-600">
          <p>© 2025 XBRL Financial Data API - Built with Next.js & Supabase</p>
        </div>
      </div>
    </div>
  )
}