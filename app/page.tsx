'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, Users, Shield, BarChart3, Check, ChevronDown, Activity } from 'react-feather';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [animatedNumber, setAnimatedNumber] = useState(0);

  // アニメーション数値
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedNumber((prev) => {
        if (prev >= 4231) return 0;
        return prev + 53;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // ライブ検索デモ
  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);

    // デモ用のモックデータ
    setTimeout(() => {
      setSearchResults([
        { id: 'S100LJ4F', name: '亀田製菓株式会社', ticker: '2220', sector: '食品' },
        { id: 'S100L3K4', name: '株式会社タカショー', ticker: '7590', sector: '卸売業' },
        { id: 'S100KLVZ', name: 'クスリのアオキホールディングス', ticker: '3549', sector: '小売業' },
      ]);
      setIsSearching(false);
    }, 500);
  };

  const handlePlanSelect = (plan: string) => {
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

      {/* ヒーローセクション - 強化版 */}
      <section className="py-20 text-center relative overflow-hidden">
        {/* アニメーション背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-50"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="inline-flex items-center bg-blue-100 text-blue-700 rounded-full px-4 py-2 mb-6">
            <Activity className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">リアルタイムで {Math.min(animatedNumber, 4231).toLocaleString()} 社のデータを提供中</span>
          </div>

          <h2 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            日本企業の財務データに
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              瞬時にアクセス
            </span>
          </h2>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            上場企業4,231社の有価証券報告書を
            <br />
            構造化されたAPIで簡単に取得・分析
          </p>

          {/* CTAボタン群 */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <a
              href="/auth/register"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 shadow-lg"
            >
              無料で始める
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a
              href="#demo"
              className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-md"
            >
              <Search className="w-5 h-5 mr-2" />
              ライブデモを試す
            </a>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">4,231</div>
              <div className="text-sm text-gray-600">対応企業数</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">20年分</div>
              <div className="text-sm text-gray-600">財務データ</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">99.9%</div>
              <div className="text-sm text-gray-600">稼働率</div>
            </div>
          </div>
        </div>
      </section>

      {/* ライブデモセクション */}
      <section id="demo" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-4">企業データを今すぐ検索</h3>
          <p className="text-gray-600 text-center mb-8">企業名やティッカーコードで検索してみてください</p>

          {/* 検索バー */}
          <div className="flex gap-2 mb-8">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="例: 亀田製菓、トヨタ、ソニー"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* 検索結果 */}
          {searchResults.length > 0 && (
            <div className="space-y-4 mb-8">
              {searchResults.map((result) => (
                <div key={result.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-lg transition-all hover:border-blue-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-lg">{result.name}</h4>
                      <p className="text-gray-600">
                        ティッカー: {result.ticker} | セクター: {result.sector} | ID: {result.id}
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition">
                      詳細を見る
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* サンプルAPIレスポンス */}
          <div className="bg-gray-900 rounded-lg p-6 text-white">
            <div className="mb-4 flex items-center">
              <span className="text-green-400 font-mono">GET</span>
              <span className="ml-2 font-mono">/api/v1/companies/search?q=亀田製菓</span>
            </div>
            <pre className="text-sm overflow-x-auto text-gray-300">
{`{
  "data": [
    {
      "id": "S100LJ4F",
      "company_name": "亀田製菓株式会社",
      "ticker_code": "2220",
      "fiscal_year": "2021",
      "sector": "食品",
      "financial_highlights": {
        "revenue": "103,305百万円",
        "operating_income": "6,889百万円",
        "net_income": "4,757百万円"
      }
    }
  ]
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">サービスの特徴</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '🏢', title: '4,231社の財務データ', description: '日本の上場企業の包括的な財務情報' },
              { icon: '📊', title: 'Markdown形式', description: '構造化されたデータで簡単に解析可能' },
              { icon: '⚡', title: 'RESTful API', description: 'シンプルで使いやすいエンドポイント' },
              { icon: '🔒', title: 'セキュアなアクセス', description: 'APIキーによる認証とレート制限' },
              { icon: '📈', title: 'リアルタイム使用状況', description: 'ダッシュボードで使用量を可視化' },
              { icon: '🎯', title: '柔軟な検索', description: '企業名、ティッカー、セクターで検索' }
            ].map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="text-4xl mb-4 text-center">{feature.icon}</div>
                <h4 className="text-xl font-semibold mb-2 text-center">{feature.title}</h4>
                <p className="text-gray-600 text-center">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 料金プランセクション */}
      <section className="py-16 bg-white">
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

      {/* お客様の声セクション */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">お客様の声</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                company: '金融データ分析会社',
                name: '田中 様',
                role: 'データサイエンティスト',
                comment: 'XBRLデータがMarkdown形式で提供されるので、解析作業が大幅に効率化されました。20年分のデータにアクセスできるのも魅力的です。',
                rating: 5
              },
              {
                company: '投資コンサルティング',
                name: '鈴木 様',
                role: 'アナリスト',
                comment: 'APIの応答速度が速く、大量のデータ処理にも対応できています。セキュリティ面でも安心して利用できています。',
                rating: 5
              },
              {
                company: 'AI開発企業',
                name: '佐藤 様',
                role: 'エンジニア',
                comment: 'シンプルなRESTful APIで実装が簡単でした。ドキュメントも充実していて、開発がスムーズに進みました。',
                rating: 5
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.comment}"</p>
                <div className="border-t pt-4">
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                  <p className="text-sm text-gray-500">{testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQセクション */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">よくある質問</h3>
          <div className="space-y-4">
            {[
              {
                q: 'どのような企業のデータが利用できますか？',
                a: '日本の上場企業4,231社の有価証券報告書データをご利用いただけます。東証プライム、スタンダード、グロース、その他の市場の企業が含まれています。'
              },
              {
                q: 'データはどのくらいの頻度で更新されますか？',
                a: '企業の決算発表に合わせて定期的に更新しています。四半期決算、本決算のタイミングで最新データが追加されます。'
              },
              {
                q: 'APIの利用制限はありますか？',
                a: 'プランによって月間のリクエスト数に制限があります。無料プランは10,000回/月、Basicは50,000回/月、Proは200,000回/月です。'
              },
              {
                q: 'どのプログラミング言語から利用できますか？',
                a: 'RESTful APIなので、HTTP通信ができるあらゆる言語から利用可能です。Python、JavaScript、Java、Ruby、PHP等のサンプルコードも提供しています。'
              },
              {
                q: 'セキュリティはどのように確保されていますか？',
                a: '環境変数ベースの認証、APIキーによるアクセス制限、レート制限、SQLインジェクション対策など、エンタープライズレベルのセキュリティを実装しています。'
              }
            ].map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition"
                >
                  <span className="font-semibold">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      openFaq === index ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 py-4 bg-gray-50 border-t">
                    <p className="text-gray-700">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APIドキュメントセクション */}
      <section className="py-16 bg-gray-50">
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