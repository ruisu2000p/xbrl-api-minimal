import Image from 'next/image';

export default function FeaturesSection() {
  const features = [
    {
      icon: 'ri-line-chart-line',
      title: 'Claudeによる高度な分析',
      description: '詳細な財務指標とデータ分析により、企業の財務状況を深く理解できます',
      image: 'https://readdy.ai/api/search-image?query=Professional%20investment%20banking%20trading%20floor%20with%20multiple%20financial%20monitors%20displaying%20advanced%20analytics%2C%20sophisticated%20data%20visualization%20with%20candlestick%20charts%20and%20risk%20metrics%2C%20modern%20dark%20theme%20interface%20with%20blue%20and%20green%20accents%2C%20high-end%20financial%20technology%20environment&width=400&height=300&seq=feature1&orientation=landscape',
      gradient: 'from-blue-500 to-indigo-500'
    },
    {
      icon: 'ri-file-text-line',
      title: '有価証券報告書まとめ',
      description: 'Claudeが有価証券報告書から重要な情報を自動抽出し、分かりやすくまとめます',
      image: 'https://readdy.ai/api/search-image?query=Professional%20financial%20document%20analysis%20with%20Claude%20AI%20interface%2C%20sophisticated%20document%20processing%20visualization%2C%20clean%20white%20background%20with%20blue%20and%20orange%20accents%2C%20modern%20AI-powered%20document%20summarization%20technology%2C%20organized%20financial%20reports%20layout&width=400&height=300&seq=feature2&orientation=landscape',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: 'ri-database-2-line',
      title: '有価証券報告書データ加工',
      description: 'Claudeによる自動データ加工で、複雑な有価証券報告書データを使いやすい形式に変換',
      image: 'https://readdy.ai/api/search-image?query=Advanced%20data%20processing%20and%20transformation%20interface%20powered%20by%20Claude%20AI%2C%20sophisticated%20financial%20data%20visualization%20with%20clean%20modern%20design%2C%20organized%20data%20tables%20and%20charts%2C%20professional%20fintech%20environment%20with%20white%20and%20blue%20color%20scheme&width=400&height=300&seq=feature3&orientation=landscape',
      gradient: 'from-green-500 to-emerald-500'
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-100/40 to-indigo-100/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-purple-100/40 to-pink-100/40 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full mb-6">
            <i className="ri-award-line text-blue-600 mr-2"></i>
            <span className="text-blue-700 text-sm font-medium">プレミアム機能</span>
          </div>
          <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              プロフェッショナル財務分析
            </span>
            <br/>で投資の未来を切り拓く
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            高精度な財務データとユーザーフレンドリーなインターフェースで、
            <br/>投資分析を効率化します。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
              <div className="relative z-10">
                <div className="mb-6">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    width={400}
                    height={208}
                    className="w-full h-52 object-cover object-top rounded-2xl group-hover:scale-105 transition-transform duration-500"
                    priority={index === 0}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                  />
                </div>

                <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                  <i className={`${feature.icon} text-white text-2xl`}></i>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-gray-800 transition-colors">
                  {feature.title}
                </h3>

                <p className="text-gray-600 leading-relaxed mb-6">
                  {feature.description}
                </p>

                {/* Premium indicator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-500 font-medium">Premium Feature</span>
                  </div>
                  <div className={`text-transparent bg-gradient-to-r ${feature.gradient} bg-clip-text font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                    詳細を見る →
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-6 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-8 shadow-xl">
            <div className="text-left">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">プロフェッショナル機能を体験</h3>
              <p className="text-gray-600">スタンダードプランを体験してみてください。</p>
            </div>
            <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 cursor-pointer whitespace-nowrap shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              <i className="ri-vip-crown-line mr-2"></i>
              スタンダードを試す
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}