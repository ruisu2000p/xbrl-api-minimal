'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const handlePlanSelect = (plan: string) => {
    // プラン情報を保存してregistrationページへ
    localStorage.setItem('selectedPlan', plan);
    router.push('/register');
  };

  // お客様の声セクションは削除

  const stats = [
    { number: "2016-2024", label: "年度", description: "対象期間" },
    { number: "即座に", label: "", description: "データ取得" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* ヘッダー */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrollY > 10 ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              財務データMCP
            </h1>
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
              日本の全上場企業をカバー<br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                した財務MCP
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              2016年度から2024年度までの有価証券報告書を含む<br />
              4,231社の完全な財務データベースを提供。
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <button 
                onClick={() => router.push('/register')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transition-all transform hover:scale-105 relative animate-pulse"
              >
                <span className="relative z-10">30秒で無料トライアル</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity"></div>
              </button>
              <button 
                onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all"
              >
                デモを見る
              </button>
            </div>
            
            {/* 統計情報 */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
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


      {/* 従来のデモセクション */}
      <section id="demo-section" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            簡単3ステップで財務データ取得
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-2xl">1</span>
              </div>
              <h4 className="text-xl font-bold mb-4">MCP設定</h4>
              <p className="text-gray-600">
                Claude Desktopの設定ファイルに1行追加するだけで、すぐに財務データへアクセス可能。
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-2xl">2</span>
              </div>
              <h4 className="text-xl font-bold mb-4">データ取得</h4>
              <p className="text-gray-600">
                自然言語でMCPを呼び出すだけで、過去の財務データを簡単に取得できます。
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-2xl">3</span>
              </div>
              <h4 className="text-xl font-bold mb-4">分析開始</h4>
              <p className="text-gray-600">
                取得したJSONデータを使って、財務分析やトレンド予測などの高度な分析を開始できます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ベータ版アクセス */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
            現在ベータ版公開中
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            ベータテスト参加者募集中
          </h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            現在ベータ版として無料でご利用いただけます。<br />
            正式版リリース時は段階的な料金プランを導入予定です。
          </p>
        </div>

        {/* ベータ版プラン */}
        <div className="max-w-lg mx-auto">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-6 py-1 rounded-full text-sm font-bold shadow-lg">
              ベータ限定
            </div>
            
            <div className="text-center mb-6">
              <h4 className="text-2xl font-bold mb-2">ベータアクセス</h4>
              <p className="text-blue-100 mb-4">フルアクセス・無料</p>
              <div className="mb-6">
                <span className="text-5xl font-bold">¥0</span>
                <span className="text-blue-100">/月</span>
                <div className="text-sm text-blue-200 mt-2">
                  正式版まで完全無料
                </div>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">直近1年分のデータアクセス</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>1,000回/月のAPI呼び出し</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>全機能へのフルアクセス</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>CSV/JSONエクスポート機能</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>コミュニティサポート</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>正式版での早期アクセス特典</span>
              </li>
            </ul>
            
            <button 
              onClick={() => handlePlanSelect('beta')}
              className="w-full bg-white text-blue-600 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg text-lg"
            >
              ベータテストに参加する
            </button>
            
            <div className="mt-6 p-4 bg-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-100 text-center">
                正式版リリース時は事前にお知らせします<br />
                ベータ参加者は正式版で特別価格を適用予定
              </p>
            </div>
          </div>
        </div>

        {/* 正式版予定 */}
        <div className="mt-16 text-center">
          <h4 className="text-xl font-bold text-gray-900 mb-4">正式版で予定されている料金プラン</h4>
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-4 opacity-75">
              <h5 className="font-bold text-gray-600">Free</h5>
              <p className="text-2xl font-bold text-gray-400">¥0/月</p>
              <p className="text-sm text-gray-500">直近1年データアクセス</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 opacity-75">
              <h5 className="font-bold text-gray-600">Pro</h5>
              <p className="text-2xl font-bold text-gray-400">¥2,980/月</p>
              <p className="text-sm text-gray-500">制限なしアクセス</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            ※ 正式版の料金は変更される可能性があります
          </p>
        </div>
      </section>

      {/* 特徴セクション */}
      <section id="features" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            財務データMCPの強力な機能
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group hover:scale-105 transition-all">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3">高速データアクセス</h4>
                <p className="text-gray-600">
                  最適化されたデータベース構造により、必要なデータを効率的に取得。大量のデータも素早くアクセス可能です。
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
                <h4 className="text-xl font-bold mb-3">高い信頼性</h4>
                <p className="text-gray-600">
                  EDINETから直接取得した正確なデータ。安定したシステムで、確実なサービスを提供します。
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
                  4,231社×10年分の有価証券報告書。財務諸表から事業リスクまで、包括的なデータを提供します。
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3">充実のドキュメント</h4>
                <p className="text-gray-600">
                  詳細なAPIドキュメントとサンプルコードを提供。開発者が迅速に実装できるよう、充実したリソースを用意しています。
                </p>
              </div>
            </div>
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
          <button
            onClick={() => router.push('/register')}
            className="bg-white text-blue-600 px-12 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg text-lg"
          >
            無料登録
          </button>
          <p className="text-blue-200 text-sm mt-4">
            登録することで、<a href="/terms" className="underline hover:text-white">利用規約</a>と<a href="/privacy" className="underline hover:text-white">プライバシーポリシー</a>に同意したものとみなされます。
          </p>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h5 className="text-white font-bold text-xl mb-4">財務データMCP</h5>
              <p className="text-sm">
                日本の上場企業4,231社の財務データを<br />
                クラウドインフラから配信
              </p>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">ドキュメント</h5>
              <p className="text-sm">
                APIの詳細はGitHubリポジトリの<br/>
                READMEをご参照ください
              </p>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">パッケージ</h5>
              <p className="text-sm">
                NPM: shared-supabase-mcp<br/>
                Claude Desktop対応
              </p>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">リポジトリ</h5>
              <p className="text-sm">
                github.com/ruisu2000p/<br/>
                xbrl-api-minimal
              </p>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="text-center">
              <div className="flex justify-center gap-6 mb-4">
                <a href="/terms" className="text-gray-400 hover:text-white text-sm">利用規約</a>
                <a href="/privacy" className="text-gray-400 hover:text-white text-sm">プライバシーポリシー</a>
              </div>
              <p className="text-sm mb-4">&copy; 2025 財務データMCP. All rights reserved.</p>
              <p className="text-xs text-gray-500">
                本サービスはXBRLデータを活用しています。<br />
                データの正確性については一切の保証をいたしません。投資判断は自己責任で行ってください。
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}