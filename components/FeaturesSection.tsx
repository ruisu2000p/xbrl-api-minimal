'use client';

export default function FeaturesSection() {
  const features = [
    {
      icon: '🏢',
      title: '包括的な財務データ',
      description: '日本の上場企業5,220社の包括的な財務情報',
      gradient: 'from-blue-500 to-indigo-500'
    },
    {
      icon: '📊',
      title: 'Markdown形式',
      description: '構造化されたデータで簡単に解析可能',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: '⚡',
      title: 'RESTful API',
      description: 'シンプルで使いやすいエンドポイント',
      gradient: 'from-violet-500 to-purple-500'
    },
    {
      icon: '🔒',
      title: 'セキュアなアクセス',
      description: 'APIキーによる認証とレート制限',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: '📈',
      title: 'リアルタイム使用状況',
      description: 'ダッシュボードで使用量を可視化',
      gradient: 'from-cyan-500 to-blue-500'
    },
    {
      icon: '🎯',
      title: '柔軟な検索',
      description: '企業名、ティッカー、セクターで検索',
      gradient: 'from-pink-500 to-rose-500'
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-100/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-violet-50 border border-violet-200 rounded-full mb-6">
            <span className="text-violet-700 text-sm font-medium">✨ サービスの特徴</span>
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              エンタープライズグレード
            </span>
            の機能
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            プロフェッショナルな財務分析に必要なすべての機能を提供
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group backdrop-blur-md bg-white/80 border border-gray-200 shadow-xl p-8 rounded-2xl hover:bg-white/90 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                <span className="text-3xl">{feature.icon}</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-12 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <h3 className="text-3xl font-bold mb-4">286,742件の財務文書にアクセス</h3>
            <p className="text-xl mb-8 text-violet-100">今すぐ無料トライアルを開始して、データの力を体験してください</p>
            <a
              href="/auth/register"
              className="inline-flex items-center px-8 py-4 bg-white text-violet-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              無料で始める
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}