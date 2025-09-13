'use client';

import { useState } from 'react';
import { Search, TrendingUp, Users, Shield, BarChart, Check, ChevronDown } from 'react-feather';

// モダンUIコンポーネント
const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-md bg-white/80 border border-white/20 shadow-xl ${className}`}>
    {children}
  </div>
);

const GradientButton = ({ children, href, variant = 'primary' }: { children: React.ReactNode; href: string; variant?: 'primary' | 'secondary' }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25',
    secondary: 'bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-gray-700'
  };

  return (
    <a href={href} className={`px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2 ${variants[variant]}`}>
      {children}
    </a>
  );
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-purple-800 via-indigo-800 to-slate-800">
      {/* モダンヘッダー */}
      <header className="fixed w-full top-0 z-50 backdrop-blur-lg bg-slate-900/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">X</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">XBRL Financial API</h1>
              </div>
            </div>
            <nav className="flex items-center gap-6">
              <a href="/docs" className="text-gray-300 hover:text-white transition-colors">
                ドキュメント
              </a>
              <a href="/pricing" className="text-gray-300 hover:text-white transition-colors">
                料金
              </a>
              <a href="/auth/login" className="text-gray-300 hover:text-white transition-colors">
                ログイン
              </a>
              <a
                href="/auth/register"
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-2.5 rounded-full hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300"
              >
                無料で始める
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* ヒーローセクション - 強化版 */}
      <section className="pt-32 pb-20 text-center relative overflow-hidden">
        {/* アニメーション背景 */}
        <div className="absolute inset-0"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-violet-600 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-indigo-600 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 relative z-10">

          <h2 className="text-6xl font-bold text-white mb-6 leading-tight">
            日本企業の財務データに
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              瞬時にアクセス
            </span>
          </h2>

          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            上場企業3,392社の有価証券報告書を
            <br />
            構造化されたAPIで簡単に取得・分析
          </p>

          {/* CTAボタン群 */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <a
              href="/auth/register"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-300 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl hover:from-violet-700 hover:to-indigo-700 transform hover:scale-105 shadow-xl shadow-violet-500/25"
            >
              無料で始める
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a
              href="#demo"
              className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl hover:bg-white/20 transition-all duration-300 shadow-md"
            >
              <Search className="w-5 h-5 mr-2" />
              ライブデモを試す
            </a>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">3,392</div>
              <div className="text-sm text-gray-400">対応企業数</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">20年分</div>
              <div className="text-sm text-gray-400">財務データ</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">99.9%</div>
              <div className="text-sm text-gray-400">稼働率</div>
            </div>
          </div>
        </div>
      </section>

      {/* ライブデモセクション */}
      <section id="demo" className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <h3 className="text-4xl font-bold text-center mb-4 text-white">企業データを今すぐ検索</h3>
          <p className="text-xl text-gray-300 text-center mb-12">企業名やティッカーコードで検索してみてください</p>

          {/* 検索バー */}
          <GlassCard className="p-8 rounded-2xl mb-12">
            <div className="flex gap-3 mb-8">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="例: 亀田製菓、トヨタ、ソニー"
                className="flex-1 px-6 py-4 bg-white/50 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 placeholder-gray-600"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
                  <div key={result.id} className="p-6 bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl hover:shadow-xl transition-all duration-300 hover:bg-white/40">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg text-gray-800">{result.name}</h4>
                        <p className="text-gray-600">
                          ティッカー: {result.ticker} | セクター: {result.sector} | ID: {result.id}
                        </p>
                      </div>
                      <button className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all duration-300 shadow-lg">
                        詳細を見る
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* サンプルAPIレスポンス */}
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-8 text-white border border-white/10 shadow-2xl">
              <div className="mb-4 flex items-center">
                <span className="text-green-400 font-mono font-bold">GET</span>
                <span className="ml-2 font-mono text-gray-300">/api/v1/companies/search?q=亀田製菓</span>
              </div>
              <pre className="text-sm overflow-x-auto text-gray-300 leading-relaxed">
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
          </GlassCard>
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 via-purple-900 to-slate-800"></div>
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <h3 className="text-4xl font-bold text-center mb-16 text-white">サービスの特徴</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '🏢', title: '3,392社の財務データ', description: '日本の上場企業の包括的な財務情報' },
              { icon: '📊', title: 'Markdown形式', description: '構造化されたデータで簡単に解析可能' },
              { icon: '⚡', title: 'RESTful API', description: 'シンプルで使いやすいエンドポイント' },
              { icon: '🔒', title: 'セキュアなアクセス', description: 'APIキーによる認証とレート制限' },
              { icon: '📈', title: 'リアルタイム使用状況', description: 'ダッシュボードで使用量を可視化' },
              { icon: '🎯', title: '柔軟な検索', description: '企業名、ティッカー、セクターで検索' }
            ].map((feature, index) => (
              <GlassCard key={index} className="p-8 rounded-2xl hover:bg-white/90 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl card-hover">
                <div className="text-5xl mb-6 text-center">{feature.icon}</div>
                <h4 className="text-xl font-semibold mb-4 text-center text-gray-800">{feature.title}</h4>
                <p className="text-gray-600 text-center leading-relaxed">{feature.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* 料金プランセクション */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-indigo-900 to-slate-900"></div>
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <h3 className="text-4xl font-bold text-center mb-16 text-white">料金プラン</h3>
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
              <GlassCard
                key={index}
                className={`rounded-2xl p-8 hover:bg-white/90 transition-all duration-300 transform hover:scale-105 ${plan.popular ? 'ring-2 ring-violet-400 shadow-2xl' : 'hover:shadow-xl'}`}
              >
                {plan.popular && (
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm px-4 py-2 rounded-full inline-block mb-6 font-semibold shadow-lg">
                    人気プラン
                  </div>
                )}
                <h4 className="text-2xl font-bold mb-4 text-gray-800">{plan.name}</h4>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start">
                      <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePlanSelect(plan.value)}
                  className={`w-full text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${plan.buttonClass} shadow-lg`}
                >
                  {plan.buttonText}
                </button>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>


      {/* FAQセクション */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-indigo-900 to-slate-900"></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <h3 className="text-4xl font-bold text-center mb-16 text-white">よくある質問</h3>
          <div className="space-y-4">
            {[
              {
                q: 'どのような企業のデータが利用できますか？',
                a: '日本の上場企業3,392社の有価証券報告書データをご利用いただけます。東証プライム、スタンダード、グロース、その他の市場の企業が含まれています。'
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
              <GlassCard key={index} className="rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-8 py-6 text-left flex justify-between items-center hover:bg-white/70 transition-all duration-300"
                >
                  <span className="font-semibold text-gray-800">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      openFaq === index ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-8 py-6 bg-white/30 border-t border-white/20 backdrop-blur-sm">
                    <p className="text-gray-700 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* APIドキュメントセクション */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 via-purple-900 to-slate-800"></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <h3 className="text-4xl font-bold text-center mb-16 text-white">簡単なAPI利用</h3>
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-8 text-white border border-white/10 shadow-2xl">
            <div className="mb-6">
              <span className="text-green-400 font-bold">GET</span>
              <span className="ml-2 text-gray-300">/api/v1/companies</span>
            </div>
            <pre className="text-sm overflow-x-auto leading-relaxed">
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
    "total": 3392
  }
}`}
            </pre>
          </div>
          <div className="text-center mt-12">
            <a
              href="/docs/api"
              className="inline-flex items-center text-white bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all duration-300 shadow-lg font-semibold"
            >
              APIドキュメントを見る
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ファイナルCTAセクション */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h3 className="text-4xl font-bold text-white mb-6">
            今すぐ始めよう
          </h3>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            3,392社の財務データにアクセスして、データドリブンな意思決定を実現しましょう
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="/auth/register"
              className="bg-white text-violet-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              無料で始める
            </a>
            <a
              href="/docs"
              className="border-2 border-white text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:text-violet-600 transition-all duration-300 transform hover:scale-105"
            >
              ドキュメントを見る
            </a>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-white py-12 relative">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">X</span>
                </div>
                <h5 className="font-bold text-xl">XBRL Financial Data API</h5>
              </div>
              <p className="text-gray-400 mb-4 leading-relaxed">
                日本の上場企業3,392社の財務データを提供するプロフェッショナルAPIです。
              </p>
              <p className="text-gray-500 text-sm">© 2025 XBRL Financial Data API. All rights reserved.</p>
            </div>

            <div>
              <h6 className="font-semibold mb-4 text-gray-300">サービス</h6>
              <ul className="space-y-2 text-sm">
                <li><a href="/docs" className="text-gray-400 hover:text-white transition-colors">ドキュメント</a></li>
                <li><a href="/pricing" className="text-gray-400 hover:text-white transition-colors">料金</a></li>
                <li><a href="/dashboard" className="text-gray-400 hover:text-white transition-colors">ダッシュボード</a></li>
                <li><a href="/support" className="text-gray-400 hover:text-white transition-colors">サポート</a></li>
              </ul>
            </div>

            <div>
              <h6 className="font-semibold mb-4 text-gray-300">法的情報</h6>
              <ul className="space-y-2 text-sm">
                <li><a href="/terms" className="text-gray-400 hover:text-white transition-colors">利用規約</a></li>
                <li><a href="/privacy" className="text-gray-400 hover:text-white transition-colors">プライバシーポリシー</a></li>
                <li><a href="/security" className="text-gray-400 hover:text-white transition-colors">セキュリティ</a></li>
                <li><a href="/compliance" className="text-gray-400 hover:text-white transition-colors">コンプライアンス</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}