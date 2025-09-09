'use client';

import { useState } from 'react';

export default function ValueProposition() {
  const [companies, setCompanies] = useState(10);
  const [hoursPerCompany, setHoursPerCompany] = useState(2);
  const [hourlyRate, setHourlyRate] = useState(5000);
  
  // 計算
  const manualCost = companies * hoursPerCompany * hourlyRate;
  const mcpTime = companies * 0.1; // MCPでは1社6分（0.1時間）
  const mcpCost = mcpTime * hourlyRate;
  const savings = manualCost - mcpCost;
  const yearlySavings = savings * 12;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Before/After比較 */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            従来の方法 vs MCP統合の効率性
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* 従来の方法 */}
            <div className="bg-red-50 rounded-2xl p-8 border-2 border-red-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-gray-900">従来の方法</h4>
              </div>
              
              <ul className="space-y-4">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">EDINETから手動ダウンロード</p>
                    <p className="text-sm text-gray-600 mt-1">1社あたり30分以上</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">XBRLパース処理の実装</p>
                    <p className="text-sm text-gray-600 mt-1">開発に2週間以上</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">データ整形・クレンジング</p>
                    <p className="text-sm text-gray-600 mt-1">さらに1週間の作業</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">エラー処理とメンテナンス</p>
                    <p className="text-sm text-gray-600 mt-1">継続的な対応が必要</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* MCPを使う方法 */}
            <div className="bg-green-50 rounded-2xl p-8 border-2 border-green-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-gray-900">MCPを使うと</h4>
              </div>
              
              <ul className="space-y-4">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">MCPコールで即座に取得</p>
                    <p className="text-sm text-gray-600 mt-1">1社あたり5秒以内</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">整形済みJSONで提供</p>
                    <p className="text-sm text-gray-600 mt-1">パース処理不要</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">過去データも一括取得</p>
                    <p className="text-sm text-gray-600 mt-1">時系列分析が簡単</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">自動更新・メンテナンス不要</p>
                    <p className="text-sm text-gray-600 mt-1">常に最新データ</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ROI計算機 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-10">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-8">
            あなたの節約額を計算
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* 入力フォーム */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月間分析企業数
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={companies}
                  onChange={(e) => setCompanies(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>1社</span>
                  <span className="font-bold text-lg text-blue-600">{companies}社</span>
                  <span>100社</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  1社あたりの作業時間（手動）
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="8"
                  step="0.5"
                  value={hoursPerCompany}
                  onChange={(e) => setHoursPerCompany(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>30分</span>
                  <span className="font-bold text-lg text-blue-600">{hoursPerCompany}時間</span>
                  <span>8時間</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  時間単価
                </label>
                <input
                  type="range"
                  min="1000"
                  max="20000"
                  step="1000"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>¥1,000</span>
                  <span className="font-bold text-lg text-blue-600">¥{hourlyRate.toLocaleString()}</span>
                  <span>¥20,000</span>
                </div>
              </div>
            </div>

            {/* 計算結果 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h4 className="text-xl font-bold text-gray-900 mb-6">節約額</h4>
              
              <div className="space-y-4">
                <div className="pb-4 border-b border-gray-200">
                  <p className="text-sm text-gray-600">従来の方法（月間）</p>
                  <p className="text-2xl font-bold text-gray-400 line-through">
                    ¥{manualCost.toLocaleString()}
                  </p>
                </div>
                
                <div className="pb-4 border-b border-gray-200">
                  <p className="text-sm text-gray-600">MCPを使った場合（月間）</p>
                  <p className="text-2xl font-bold text-green-600">
                    ¥{mcpCost.toLocaleString()}
                  </p>
                </div>
                
                <div className="pb-4 border-b border-gray-200">
                  <p className="text-sm text-gray-600 font-semibold">月間節約額</p>
                  <p className="text-3xl font-bold text-blue-600">
                    ¥{savings.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-6 text-white">
                  <p className="text-sm font-semibold mb-2">年間節約額</p>
                  <p className="text-4xl font-bold">
                    ¥{yearlySavings.toLocaleString()}
                  </p>
                  <p className="text-sm mt-2 text-blue-100">
                    のコスト削減が可能です
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transition-all transform hover:scale-105">
              今すぐ節約を始める
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}