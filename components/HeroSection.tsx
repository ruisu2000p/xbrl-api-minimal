'use client';

import Link from 'next/link';

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-400/5 to-transparent rounded-full"></div>
      </div>

      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.02\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"1\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')",
        }}
      ></div>

      <div className="relative w-full max-w-7xl mx-auto px-6 py-20">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/30 rounded-full mb-8 backdrop-blur-sm">
            <i className="ri-vip-crown-line text-yellow-400 mr-2"></i>
            <span className="text-blue-100 text-sm font-medium">プロフェッショナル財務データAPI</span>
          </div>

          <h1 className="text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight">
            <span className="bg-gradient-to-r from-blue-200 via-white to-indigo-200 bg-clip-text text-transparent">
              次世代金融データ
            </span>
            <br />
            <span className="text-white">プラットフォーム</span>
          </h1>

          <p className="text-xl text-blue-100 mb-12 leading-relaxed max-w-3xl mx-auto">
            日本最大級のXBRL財務データベースで、企業の財務情報を瞬時に取得。
            <br />
            投資判断に必要なデータを効率的に分析できます。
          </p>

          <div className="flex flex-col sm:flex-row gap-6 mb-16 justify-center">
            <Link
              href="#demo"
              prefetch={false}
              className="group relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 cursor-pointer whitespace-nowrap text-center shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              <span className="relative z-10">インタラクティブデモを見る</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
            </Link>
            <Link
              href="#features"
              prefetch={false}
              className="group border-2 border-blue-400/50 text-blue-100 px-10 py-4 rounded-xl text-lg font-semibold hover:bg-blue-400/10 hover:border-blue-400 transition-all duration-300 cursor-pointer whitespace-nowrap text-center backdrop-blur-sm"
            >
              <i className="ri-compass-3-line mr-2"></i>
              主要機能を確認
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent mb-2">
                3,800+
              </div>
              <div className="text-blue-200 text-sm">上場企業データ</div>
            </div>
            <div className="text-center p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent mb-2">
                有価証券報告書データ取得
              </div>
              <div className="text-blue-200 text-sm">履歴データ保有</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
