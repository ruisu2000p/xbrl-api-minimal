'use client';

import { useState } from 'react';

export default function SearchDemo() {
  const [searchTerm, setSearchTerm] = useState('亀田製菓');
  const [isLoading, setIsLoading] = useState(false);
  const [showResponse, setShowResponse] = useState(false);

  const handleSearch = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setShowResponse(true);
    }, 1500);
  };

  const sampleResponse = `{
  "data": [
    {
      "id": "S100LJ4F",
      "company_name": "亀田製菓株式会社",
      "ticker_code": "2220",
      "fiscal_year": "2024",
      "sector": "食品",
      "financial_highlights": {
        "revenue": "103,305百万円",
        "operating_income": "6,889百万円",
        "net_income": "4,757百万円"
      }
    }
  ]
}`;

  return (
    <section id="demo" className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-full mb-6">
            <span className="text-blue-700 text-sm font-medium">🔍 インタラクティブAPI</span>
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              企業データを今すぐ検索
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            企業名やティッカーコードで検索してみてください
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-semibold text-lg">XBRL Financial API Explorer</span>
                  </div>
                </div>
                <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                  <span className="text-white text-sm font-medium">v5.0</span>
                </div>
              </div>
            </div>

            <div className="p-8 bg-gradient-to-b from-gray-50 to-white">
              <div className="flex gap-3 mb-8">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="例: 亀田製菓、トヨタ、ソニー"
                  className="flex-1 px-6 py-4 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 placeholder-gray-600"
                />
                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      検索中...
                    </div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  )}
                </button>
              </div>

              {showResponse && (
                <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-8 text-white border border-gray-700 shadow-2xl">
                  <div className="mb-4 flex items-center">
                    <span className="text-green-400 font-mono font-bold">GET</span>
                    <span className="ml-2 font-mono text-gray-300">/api/v1/companies/search?q={searchTerm}</span>
                  </div>
                  <pre className="text-sm overflow-x-auto text-gray-300 leading-relaxed">{sampleResponse}</pre>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white text-xl">🤖</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Claude MCP統合</h3>
              <p className="text-gray-600 text-sm">Claude Desktopから直接アクセス可能</p>
            </div>

            <div className="text-center p-6 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white text-xl">📊</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Markdown形式</h3>
              <p className="text-gray-600 text-sm">構造化されたデータで簡単に解析</p>
            </div>

            <div className="text-center p-6 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white text-xl">⚡</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">高速レスポンス</h3>
              <p className="text-gray-600 text-sm">200ms以下の応答時間</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}