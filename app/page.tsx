'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const handlePlanSelect = (plan: string) => {
    // プラン選択後、登録ページへ遷移
    localStorage.setItem('selectedPlan', plan);
    window.location.href = '/auth/register';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">XBRL Financial Data API</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <a href="/auth/login" className="text-gray-600 hover:text-gray-900">
                ログイン
              </a>
              <a 
                href="/auth/register" 
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              >
                無料で始める
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            日本企業の財務データに
            <span className="text-blue-600">簡単アクセス</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            4,231社の有価証券報告書データをAPIで提供
            <br />
            XBRL/EDINETデータを構造化されたJSON形式で取得
          </p>
          <div className="flex justify-center space-x-4">
            <a 
              href="/auth/register"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
            >
              無料アカウント作成
            </a>
            <a 
              href="/dashboard"
              className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-50 transition"
            >
              ダッシュボード
            </a>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">主な特徴</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '🏢', title: '4,231社の財務データ', description: '日本の上場企業の包括的な財務情報' },
              { icon: '📊', title: 'Markdown形式', description: '構造化されたデータで簡単に解析可能' },
              { icon: '⚡', title: 'RESTful API', description: 'シンプルで使いやすいエンドポイント' },
              { icon: '🔒', title: 'セキュアなアクセス', description: 'APIキーによる認証とレート制限' },
              { icon: '📈', title: 'リアルタイム使用状況', description: 'ダッシュボードで使用量を可視化' },
              { icon: '🎯', title: '柔軟な検索', description: '企業名、ティッカー、セクターで検索' }
            ].map((feature, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 料金プランセクション */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">料金プラン</h3>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                name: '無料',
                price: '¥0',
                period: '/月',
                features: [
                  '10,000 リクエスト/月',
                  '基本APIアクセス',
                  '1年分のデータ',
                  'コミュニティサポート'
                ],
                buttonText: '無料で始める',
                buttonClass: 'bg-gray-600 hover:bg-gray-700',
                value: 'free'
              },
              {
                name: 'Basic',
                price: '¥5,000',
                period: '/月',
                features: [
                  '50,000 リクエスト/月',
                  '全APIアクセス',
                  '3年分のデータ',
                  'メールサポート',
                  'Webhook対応'
                ],
                buttonText: 'Basicを選択',
                buttonClass: 'bg-blue-600 hover:bg-blue-700',
                value: 'basic'
              },
              {
                name: 'Pro',
                price: '¥20,000',
                period: '/月',
                features: [
                  '200,000 リクエスト/月',
                  '全APIアクセス',
                  '全期間データ',
                  '優先サポート',
                  'SLA保証',
                  'カスタムフィールド'
                ],
                buttonText: 'Proを選択',
                buttonClass: 'bg-purple-600 hover:bg-purple-700',
                popular: true,
                value: 'pro'
              },
              {
                name: 'Enterprise',
                price: 'お問い合わせ',
                period: '',
                features: [
                  '無制限リクエスト',
                  'カスタマイズ可能',
                  '専任サポート',
                  'オンプレミス対応',
                  'SLA 99.9%保証'
                ],
                buttonText: 'お問い合わせ',
                buttonClass: 'bg-gray-800 hover:bg-gray-900',
                value: 'enterprise'
              }
            ].map((plan, index) => (
              <div 
                key={index} 
                className={`bg-white rounded-lg shadow-lg p-6 ${plan.popular ? 'ring-2 ring-purple-600' : ''}`}
              >
                {plan.popular && (
                  <div className="bg-purple-600 text-white text-sm px-3 py-1 rounded-full inline-block mb-4">
                    人気プラン
                  </div>
                )}
                <h4 className="text-2xl font-bold mb-2">{plan.name}</h4>
                <div className="mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-600 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => handlePlanSelect(plan.value)}
                  className={`w-full text-white py-2 px-4 rounded-lg font-semibold transition ${plan.buttonClass}`}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APIドキュメントセクション */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">簡単なAPI利用</h3>
          <div className="bg-gray-900 rounded-lg p-6 text-white">
            <div className="mb-4">
              <span className="text-green-400">GET</span>
              <span className="ml-2">/api/v1/companies</span>
            </div>
            <pre className="text-sm overflow-x-auto">
{`{
  "data": [
    {
      "id": "S100L3K4",
      "company_name": "株式会社タカショー",
      "ticker_code": "7590",
      "fiscal_year": "2021",
      "sector": "卸売業"
    }
  ],
  "pagination": {
    "page": 1,
    "total": 4231
  }
}`}
            </pre>
          </div>
          <div className="text-center mt-8">
            <a 
              href="/docs/api" 
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              APIドキュメントを見る →
            </a>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center">
            <div>
              <h5 className="font-bold mb-2">XBRL Financial Data API</h5>
              <p className="text-gray-400 text-sm">© 2025 All rights reserved.</p>
            </div>
            <div className="flex space-x-6">
              <a href="/terms" className="text-gray-400 hover:text-white">利用規約</a>
              <a href="/privacy" className="text-gray-400 hover:text-white">プライバシーポリシー</a>
              <a href="/docs" className="text-gray-400 hover:text-white">ドキュメント</a>
              <a href="/support" className="text-gray-400 hover:text-white">サポート</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}