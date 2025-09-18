'use client';

import { useState } from 'react';

export default function SearchDemo() {
  const [searchTerm, setSearchTerm] = useState('トヨタ自動車');
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
  "company": {
    "name": "トヨタ自動車株式会社",
    "code": "7203",
    "sector": "輸送用機器",
    "market_cap": 28456000000000,
    "listing_date": "1949-05-16"
  },
  "financials": {
    "fiscal_year": 2023,
    "revenue": 37154310000000,
    "operating_income": 2725656000000,
    "net_income": 2450093000000,
    "total_assets": 69929133000000,
    "equity": 26745356000000
  },
  "ratios": {
    "roe": 9.2,
    "roa": 4.1,
    "debt_ratio": 0.18,
    "current_ratio": 1.13,
    "per": 9.8,
    "pbr": 0.9
  },
  "esg_score": {
    "environmental": 8.5,
    "social": 7.8,
    "governance": 8.9,
    "total": 8.4
  }
}`;

  return (
    <section id="demo" className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-full mb-6">
            <i className="ri-code-s-slash-line text-blue-600 mr-2"></i>
            <span className="text-blue-700 text-sm font-medium">インタラクティブAPI</span>
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              リアルタイム
            </span>
            財務分析
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            財務データに瞬時にアクセス。Claudemcpによる分析を提供。
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Claude Desktop Style API Explorer */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Claude Desktop Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <i className="ri-robot-2-line text-white text-lg"></i>
                    </div>
                    <span className="text-white font-semibold text-lg">Claude Desktop</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                    <span className="text-white text-sm font-medium">XBRL Financial API</span>
                  </div>
                  <button className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm">
                    <i className="ri-settings-3-line text-white"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Interface Style */}
            <div className="p-8 bg-gradient-to-b from-gray-50 to-white min-h-[600px]">
              {/* User Message */}
              <div className="flex justify-end mb-6">
                <div className="bg-orange-500 text-white px-6 py-3 rounded-2xl rounded-br-md max-w-md shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium">GET /api/v1/companies/</span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-white/20 text-white placeholder-white/70 px-3 py-1 rounded-lg border-0 outline-none text-sm flex-1"
                      placeholder="企業名またはコード"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={isLoading}
                    className="w-full bg-white/20 hover:bg-white/30 disabled:bg-white/10 text-white px-4 py-2 rounded-lg transition-all duration-300 cursor-pointer whitespace-nowrap font-medium text-sm backdrop-blur-sm"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        分析中...
                      </div>
                    ) : (
                      <>
                        <i className="ri-search-line mr-2"></i>
                        実行
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Claude Response */}
              {showResponse && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 shadow-lg rounded-2xl rounded-bl-md max-w-4xl w-full">
                    {/* Claude Avatar and Header */}
                    <div className="flex items-center space-x-3 p-4 border-b border-gray-100">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
                        <i className="ri-robot-2-line text-white text-sm"></i>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Claude</span>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            <i className="ri-check-line mr-1"></i>
                            200 OK
                          </span>
                          <span>Response time: 87ms</span>
                        </div>
                      </div>
                    </div>

                    {/* Response Content */}
                    <div className="p-6">
                      <div className="bg-gray-900 rounded-xl p-6 font-mono text-sm overflow-x-auto">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-gray-400 text-xs">JSON Response</div>
                          <button className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-800">
                            <i className="ri-file-copy-line text-sm"></i>
                          </button>
                        </div>
                        <pre className="text-green-400 leading-relaxed text-xs">{sampleResponse}</pre>
                      </div>

                      {/* Analysis */}
                      <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                        <div className="flex items-center space-x-2 mb-3">
                          <i className="ri-lightbulb-line text-orange-600"></i>
                          <span className="font-semibold text-orange-800">分析結果</span>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          トヨタ自動車の財務データを取得しました。ROE 9.2%、時価総額28.4兆円の優良企業です。ESGスコアも8.4と高く、持続可能な経営を行っています。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!showResponse && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 shadow-lg rounded-2xl rounded-bl-md max-w-2xl">
                    <div className="flex items-center space-x-3 p-4 border-b border-gray-100">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
                        <i className="ri-robot-2-line text-white text-sm"></i>
                      </div>
                      <span className="font-semibold text-gray-900">Claude</span>
                    </div>
                    <div className="p-6 text-center text-gray-500">
                      <i className="ri-message-3-line text-4xl mb-4 opacity-50"></i>
                      <p>企業名やコードを入力して分析を開始してください</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
