'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // お客様の声は削除
  const [scrollY, setScrollY] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // お客様の声カルーセルは削除

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // 実際の登録処理をシミュレート
    setTimeout(() => {
      // メールをlocalStorageに保存してregistrationページへ
      localStorage.setItem('pendingEmail', email);
      router.push('/register');
    }, 500);
  };

  const handlePlanSelect = (plan: string) => {
    // プラン情報を保存してregistrationページへ
    localStorage.setItem('selectedPlan', plan);
    router.push('/register');
  };

  // お客様の声セクションは削除

  const stats = [
    { number: "4,231", label: "社", description: "対応企業数" },
    { number: "20", label: "年分", description: "データ期間" },
    { number: "50ms", label: "未満", description: "平均レスポンス" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* ヘッダー */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrollY > 10 ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">X</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                XBRL財務データAPI
              </h1>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">機能</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">料金</a>
              <a href="#docs" className="text-gray-600 hover:text-gray-900 transition-colors">ドキュメント</a>
              <a href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">ログイン</a>
              <button 
                onClick={() => router.push('/register')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-full hover:shadow-lg transition-all transform hover:scale-105"
              >
                無料で始める
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-transparent to-indigo-100/20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h2 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
              20年分の財務データに<br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                瞬時にアクセス
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              日本の上場企業4,231社の有価証券報告書データを<br />
              高速なAPIで提供。投資分析からデータサイエンスまで、<br />
              あらゆるニーズに対応します。
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <button 
                onClick={() => router.push('/register')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transition-all transform hover:scale-105"
              >
                無料で始める →
              </button>
              <button 
                onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all"
              >
                デモを見る
              </button>
            </div>
            
            {/* 統計情報 */}
            <div className="grid grid-cols-3 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {stat.number}
                    <span className="text-xl">{stat.label}</span>
                  </div>
                  <div className="text-sm text-gray-600">{stat.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* デモセクション */}
      <section id="demo-section" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            簡単3ステップで財務データ取得
          </h3>
          <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-blue-400 font-mono text-sm mb-2">Step 1: APIキー取得</div>
                <pre className="text-green-400 text-xs overflow-x-auto">
{`curl -X POST https://api.xbrl.jp/auth/register \\
  -d "email=you@example.com"`}
                </pre>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-blue-400 font-mono text-sm mb-2">Step 2: データ取得</div>
                <pre className="text-green-400 text-xs overflow-x-auto">
{`curl -H "X-API-Key: your_key" \\
  https://api.xbrl.jp/v1/companies/7203`}
                </pre>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-blue-400 font-mono text-sm mb-2">Step 3: 分析開始</div>
                <pre className="text-green-400 text-xs overflow-x-auto">
{`{
  "company": "トヨタ自動車",
  "revenue": "37,154,298",
  "profit": "2,850,110"
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 料金プラン */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-4">
          あなたに最適なプランを選択
        </h3>
        <p className="text-center text-gray-600 mb-12">
          いつでもアップグレード・ダウングレード可能です。
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Free */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1">
            <h4 className="text-2xl font-bold mb-2">Free</h4>
            <p className="text-gray-600 mb-4">個人の学習・研究用</p>
            <div className="mb-6">
              <span className="text-5xl font-bold">¥0</span>
              <span className="text-gray-600">/月</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>直近1年分のデータアクセス</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>100回/月のAPI呼び出し</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>基本的な検索機能</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>コミュニティサポート</span>
              </li>
            </ul>
            <button 
              onClick={() => handlePlanSelect('free')}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              無料で始める
            </button>
          </div>

          {/* Standard */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white relative transform scale-105 hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-6 py-1 rounded-full text-sm font-bold shadow-lg">
              🔥 最も人気
            </div>
            <h4 className="text-2xl font-bold mb-2">Standard</h4>
            <p className="text-blue-100 mb-4">個人開発者・スタートアップ向け</p>
            <div className="mb-6">
              <span className="text-5xl font-bold">¥1,080</span>
              <span className="text-blue-100">/月</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>直近5年分のデータアクセス</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>3,000回/月のAPI呼び出し</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>CSV/Excelエクスポート機能</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>メールサポート（24時間以内）</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>高度な検索・フィルタリング</span>
              </li>
            </ul>
            <button 
              onClick={() => handlePlanSelect('standard')}
              className="w-full bg-white text-blue-600 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg"
            >
              今すぐアップグレード
            </button>
          </div>

          {/* Pro */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1">
            <h4 className="text-2xl font-bold mb-2">Pro</h4>
            <p className="text-gray-600 mb-4">プロフェッショナル向け</p>
            <div className="mb-6">
              <span className="text-5xl font-bold">¥2,980</span>
              <span className="text-gray-600">/月</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">全20年分のデータアクセス</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">無制限のAPI呼び出し</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>優先APIアクセス（低レイテンシ）</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>専用サポート（Slack/電話）</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Webhook・バッチ処理対応</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>カスタムデータ処理</span>
              </li>
            </ul>
            <button 
              onClick={() => handlePlanSelect('pro')}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all"
            >
              Proプランで始める
            </button>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section id="features" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            XBRL財務データAPIの強力な機能
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group hover:scale-105 transition-all">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3">超高速レスポンス</h4>
                <p className="text-gray-600">
                  最適化されたインフラにより、平均50ms未満のレスポンスタイムを実現。大量のデータも瞬時に取得可能です。
                </p>
              </div>
            </div>
            
            <div className="group hover:scale-105 transition-all">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3">信頼性99.9%</h4>
                <p className="text-gray-600">
                  EDINETから直接取得した正確なデータ。冗長化されたシステムで、常に安定したサービスを提供します。
                </p>
              </div>
            </div>
            
            <div className="group hover:scale-105 transition-all">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3">シンプルなAPI</h4>
                <p className="text-gray-600">
                  RESTful APIで簡単統合。充実したドキュメントとSDKで、すぐに開発を始められます。
                </p>
              </div>
            </div>
            
            <div className="group hover:scale-105 transition-all">
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3">膨大なデータ量</h4>
                <p className="text-gray-600">
                  4,231社×20年分の有価証券報告書。財務諸表から事業リスクまで、包括的なデータを提供します。
                </p>
              </div>
            </div>
            
            <div className="group hover:scale-105 transition-all">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3">高度な分析機能</h4>
                <p className="text-gray-600">
                  時系列分析、業界比較、財務指標計算など、データ分析に必要な機能を標準装備しています。
                </p>
              </div>
            </div>
            
            <div className="group hover:scale-105 transition-all">
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-600 to-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3">24時間サポート</h4>
                <p className="text-gray-600">
                  プロプランでは専用のサポートチームが24時間体制で対応。技術的な質問から実装支援まで幅広くサポートします。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* FAQ */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            よくある質問
          </h3>
          <div className="space-y-6">
            <details className="group bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-all">
              <summary className="flex justify-between items-center cursor-pointer">
                <span className="font-semibold text-lg">APIキーはどのように取得できますか？</span>
                <span className="text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600">
                無料アカウントに登録後、ダッシュボードからワンクリックでAPIキーを生成できます。キーは即座に利用可能になります。
              </p>
            </details>
            
            <details className="group bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-all">
              <summary className="flex justify-between items-center cursor-pointer">
                <span className="font-semibold text-lg">データはどのくらいの頻度で更新されますか？</span>
                <span className="text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600">
                EDINETに新しい有価証券報告書が提出されると、24時間以内に自動的にデータベースに反映されます。
              </p>
            </details>
            
            <details className="group bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-all">
              <summary className="flex justify-between items-center cursor-pointer">
                <span className="font-semibold text-lg">プランの変更はいつでもできますか？</span>
                <span className="text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600">
                はい、いつでもアップグレード・ダウングレードが可能です。変更は即座に反映され、日割り計算で料金調整されます。
              </p>
            </details>
            
            <details className="group bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-all">
              <summary className="flex justify-between items-center cursor-pointer">
                <span className="font-semibold text-lg">SDKは提供されていますか？</span>
                <span className="text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600">
                Python、JavaScript/TypeScript、Ruby、Go向けの公式SDKを提供しています。GitHubで公開しており、コミュニティによる他言語のSDKも利用可能です。
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h3 className="text-4xl font-bold text-white mb-6">
            今すぐ無料で始めましょう
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            クレジットカード不要。わずか30秒で登録完了。
          </p>
          <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレスを入力"
              className="flex-1 px-6 py-4 rounded-xl text-gray-900 text-lg"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg"
            >
              {isSubmitting ? '送信中...' : '無料登録 →'}
            </button>
          </form>
          <p className="text-blue-200 text-sm mt-4">
            登録することで、<a href="/terms" className="underline">利用規約</a>と<a href="/privacy" className="underline">プライバシーポリシー</a>に同意したものとみなされます。
          </p>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">X</span>
                </div>
                <h5 className="text-white font-bold text-xl">XBRL財務データAPI</h5>
              </div>
              <p className="text-sm mb-4">
                日本の上場企業4,231社の財務データを提供する<br />
                APIサービスです。
              </p>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">プロダクト</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">機能</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">料金</a></li>
                <li><a href="/docs" className="hover:text-white transition-colors">API仕様</a></li>
                <li><a href="/sdk" className="hover:text-white transition-colors">SDK</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">サポート</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="/docs" className="hover:text-white transition-colors">ドキュメント</a></li>
                <li><a href="/tutorials" className="hover:text-white transition-colors">チュートリアル</a></li>
                <li><a href="/faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">お問い合わせ</a></li>
                <li><a href="/status" className="hover:text-white transition-colors">サービス状態</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">会社情報</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="/terms" className="hover:text-white transition-colors">利用規約</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">プライバシー</a></li>
                <li><a href="/law" className="hover:text-white transition-colors">特定商取引法</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm">
            <p>&copy; 2024 XBRL財務データAPI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}