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
}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              財務データMCP
            </h1>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">機能</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">料金</a>
              <a href="#docs" className="text-gray-600 hover:text-gray-900 transition-colors">ドキュメント</a>
              <a href="/auth" className="text-gray-600 hover:text-gray-900 transition-colors">ログイン</a>
              <button 
                onClick={() => router.push('/auth')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-full hover:shadow-lg transition-all transform hover:scale-105"
              >
                無料で始める
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            日本企業の財務データを
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              シンプルなAPIで
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            4,231社の有価証券報告書データをMarkdown形式で提供。
            Claude Desktopとの完全統合により、自然言語での財務分析が可能に。
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => router.push('/auth')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl transition-all transform hover:scale-105"
            >
              今すぐ始める
            </button>
            <a 
              href="#docs"
              className="bg-white text-gray-700 px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl transition-all border border-gray-200"
            >
              ドキュメントを見る
            </a>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              強力な機能
            </h2>
            <p className="text-xl text-gray-600">
              開発者のための最適化されたXBRL財務データAPI
            </p>
          </div>

          {/* 機能カード */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {[
              { icon: '🏢', title: '4,231社の財務データ', description: '日本の上場企業の包括的な財務情報' },
              { icon: '📊', title: 'Markdown形式', description: '解析しやすい構造化データ' },
              { icon: '⚡', title: '高速レスポンス', description: 'Supabaseインフラによる高速アクセス' },
              { icon: '🔐', title: 'セキュアAPI', description: 'APIキー認証による安全なアクセス' }
            ].map((feature, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* インタラクティブデモ */}
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Claude Desktop MCPの使い方
            </h3>
            
            <div className="bg-gray-900 rounded-lg p-6 text-white">
              <pre className="text-sm overflow-x-auto">
                <code>{`{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal"]
    }
  }
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* 料金セクション */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              シンプルな料金プラン
            </h2>
            <p className="text-xl text-gray-600">
              現在ベータ版として無料でご利用いただけます
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free プラン */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Free</h3>
              <p className="text-4xl font-bold mb-6">
                ¥0<span className="text-lg text-gray-600">/月</span>
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  直近1年分のデータ
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  100回/月のAPIコール
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  基本サポート
                </li>
              </ul>
              <button 
                onClick={() => handlePlanSelect('free')}
                className="w-full py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                無料で開始
              </button>
            </div>

            {/* Standard プラン */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 text-white transform scale-105">
              <div className="bg-white/20 backdrop-blur rounded-full px-3 py-1 inline-block mb-4">
                <span className="text-sm font-semibold">人気</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Standard</h3>
              <p className="text-4xl font-bold mb-6">
                ¥1,080<span className="text-lg opacity-80">/月</span>
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  直近3年分のデータ
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  500回/月のAPIコール
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  優先サポート
                </li>
              </ul>
              <button 
                onClick={() => handlePlanSelect('standard')}
                className="w-full py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                今すぐ始める
              </button>
            </div>

            {/* Pro プラン */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Pro</h3>
              <p className="text-4xl font-bold mb-6">
                ¥2,980<span className="text-lg text-gray-600">/月</span>
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  全期間データ無制限
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  無制限APIコール
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  専用サポート
                </li>
              </ul>
              <button 
                onClick={() => handlePlanSelect('pro')}
                className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Proを選択
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ドキュメントセクション */}
      <section id="docs" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">MCP設定ガイド</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4">セットアップ手順</h3>
            <ol className="space-y-4 list-decimal list-inside">
              <li className="text-gray-700">Claude Desktopをインストール</li>
              <li className="text-gray-700">上記の設定をclaude_desktop_config.jsonに追加</li>
              <li className="text-gray-700">MCPサーバーパッケージをインストール</li>
              <li className="text-gray-700">Claude Desktopを再起動</li>
            </ol>
          </div>

          <div className="text-center">
            <a 
              href="https://github.com/ruisu2000p/xbrl-api-minimal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
            >
              詳細なドキュメントはGitHubで →
            </a>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <p className="text-gray-400">© 2025 財務データMCP. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="https://github.com/ruisu2000p/xbrl-api-minimal" className="text-gray-400 hover:text-white">
                GitHub
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                プライバシーポリシー
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                利用規約
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}