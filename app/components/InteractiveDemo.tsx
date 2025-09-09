'use client';

import { useState, useEffect } from 'react';

// サンプル企業データ
const sampleCompanies = [
  { id: 'S100TIJL', name: 'トヨタ自動車', ticker: '7203', revenue: '37154290', profit: '2995095', roe: '12.8' },
  { id: 'S100L3K4', name: 'ソニーグループ', ticker: '6758', revenue: '11539837', profit: '882178', roe: '10.2' },
  { id: 'S100KLVZ', name: '任天堂', ticker: '7974', revenue: '1695344', profit: '432668', roe: '14.7' },
  { id: 'S100M1BB', name: 'キーエンス', ticker: '6861', revenue: '755174', profit: '303360', roe: '8.3' },
  { id: 'S100M3Q8', name: 'ファーストリテイリング', ticker: '9983', revenue: '2301122', profit: '273335', roe: '16.5' },
];

export default function InteractiveDemo() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<typeof sampleCompanies[0] | null>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [compareCompanies, setCompareCompanies] = useState<typeof sampleCompanies>([]);
  const [chartType, setChartType] = useState<'revenue' | 'profit' | 'roe'>('revenue');
  const [copied, setCopied] = useState(false);

  const filteredCompanies = sampleCompanies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.ticker.includes(searchQuery)
  );

  const handleCompanySelect = (company: typeof sampleCompanies[0]) => {
    setSelectedCompany(company);
    setShowResponse(true);
    
    // アニメーション用
    setTimeout(() => {
      const element = document.getElementById('response-section');
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleCompare = (company: typeof sampleCompanies[0]) => {
    if (compareCompanies.find(c => c.id === company.id)) {
      setCompareCompanies(compareCompanies.filter(c => c.id !== company.id));
    } else if (compareCompanies.length < 2) {
      setCompareCompanies([...compareCompanies, company]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mockMCPResponse = selectedCompany ? `{
  "tool": "search-companies",
  "query": "${selectedCompany.name}",
  "result": {
    "company_id": "${selectedCompany.id}",
    "company_name": "${selectedCompany.name}",
    "ticker_symbol": "${selectedCompany.ticker}",
    "fiscal_year": "2022",
    "financial_data": {
      "revenue": ${selectedCompany.revenue}000000,
      "operating_profit": ${Math.floor(Number(selectedCompany.profit) * 1.2)}000000,
      "net_profit": ${selectedCompany.profit}000000,
      "total_assets": ${Math.floor(Number(selectedCompany.revenue) * 3)}000000,
      "shareholders_equity": ${Math.floor(Number(selectedCompany.revenue) * 1.5)}000000,
      "roe": ${selectedCompany.roe},
      "roa": ${(Number(selectedCompany.roe) * 0.6).toFixed(1)}
    },
    "segment_data": {
      "japan": ${Math.floor(Number(selectedCompany.revenue) * 0.4)}000000,
      "north_america": ${Math.floor(Number(selectedCompany.revenue) * 0.3)}000000,
      "europe": ${Math.floor(Number(selectedCompany.revenue) * 0.2)}000000,
      "asia": ${Math.floor(Number(selectedCompany.revenue) * 0.1)}000000
    }
  }
}` : '';

  // チャートデータの計算
  const getChartHeight = (value: number, max: number) => {
    return Math.max((value / max) * 200, 10);
  };

  const chartData = compareCompanies.map(company => {
    switch(chartType) {
      case 'revenue':
        return { name: company.name, value: Number(company.revenue), unit: '百万円' };
      case 'profit':
        return { name: company.name, value: Number(company.profit), unit: '百万円' };
      case 'roe':
        return { name: company.name, value: Number(company.roe), unit: '%' };
      default:
        return { name: company.name, value: 0, unit: '' };
    }
  });

  const maxValue = Math.max(...chartData.map(d => d.value), 1);

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h3 className="text-4xl font-bold text-gray-900 mb-4">
            ライブデモ - 実際に企業データを検索
          </h3>
          <p className="text-xl text-gray-600">
            トップページで実際に企業を検索して、MCPレスポンスを確認できます
          </p>
        </div>

        {/* 企業検索ウィジェット */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              企業名またはティッカーコードで検索
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="例: トヨタ、7203"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
              <svg className="absolute right-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* 検索結果 */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanies.map((company) => (
              <div
                key={company.id}
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg ${
                  selectedCompany?.id === company.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleCompanySelect(company)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-gray-900">{company.name}</h4>
                    <p className="text-sm text-gray-500">({company.ticker})</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCompare(company);
                    }}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      compareCompanies.find(c => c.id === company.id)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {compareCompanies.find(c => c.id === company.id) ? '比較中' : '比較'}
                  </button>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">売上高:</span>
                    <span className="font-semibold">{Number(company.revenue).toLocaleString()}百万円</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">純利益:</span>
                    <span className="font-semibold">{Number(company.profit).toLocaleString()}百万円</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ROE:</span>
                    <span className="font-semibold">{company.roe}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedCompany && (
            <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
              <p className="text-green-800 font-semibold text-center">
                <svg className="inline w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                これが無料で使える！{selectedCompany.name}の財務データを取得しました
              </p>
            </div>
          )}
        </div>

        {/* MCPレスポンス可視化 */}
        {showResponse && selectedCompany && (
          <div id="response-section" className="bg-gray-900 rounded-2xl shadow-xl p-8 mb-8 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xl font-bold text-white">MCPレスポンス (JSON)</h4>
              <button
                onClick={() => copyToClipboard(mockMCPResponse)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="inline w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    コピー済み
                  </>
                ) : (
                  <>
                    <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="text-green-400 text-sm overflow-x-auto">
              <code>{mockMCPResponse}</code>
            </pre>
          </div>
        )}

        {/* 比較デモ */}
        {compareCompanies.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h4 className="text-xl font-bold text-gray-900 mb-6">
              財務比較チャート - あなたの分析に使える
            </h4>
            
            {/* チャートタイプ選択 */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setChartType('revenue')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  chartType === 'revenue' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                売上高
              </button>
              <button
                onClick={() => setChartType('profit')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  chartType === 'profit' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                純利益
              </button>
              <button
                onClick={() => setChartType('roe')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  chartType === 'roe' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ROE
              </button>
            </div>

            {/* チャート */}
            <div className="flex items-end justify-center gap-8 h-64 mb-4">
              {chartData.map((data, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div
                    className="w-24 bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t-lg transition-all duration-500 relative group"
                    style={{ height: `${getChartHeight(data.value, maxValue)}px` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {data.value.toLocaleString()}{data.unit}
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-gray-700 text-center">
                    {data.name}
                  </p>
                </div>
              ))}
            </div>

            {compareCompanies.length === 1 && (
              <p className="text-center text-gray-500 text-sm">
                もう1社選択して比較できます
              </p>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </section>
  );
}