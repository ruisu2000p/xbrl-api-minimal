'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import VideoPlayer from './VideoPlayer';

export default function FeaturesSectionWithVideo() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  const features = [
    {
      icon: 'ri-line-chart-line',
      title: 'リアルタイム財務分析',
      description: '詳細な財務指標とデータ分析により、企業の財務状況を深く理解できます',
      image: 'https://readdy.ai/api/search-image?query=Professional%20investment%20banking%20trading%20floor%20with%20multiple%20financial%20monitors%20displaying%20advanced%20analytics%2C%20sophisticated%20data%20visualization%20with%20candlestick%20charts%20and%20risk%20metrics%2C%20modern%20dark%20theme%20interface%20with%20blue%20and%20green%20accents%2C%20high-end%20financial%20technology%20environment&width=400&height=300&seq=feature1&orientation=landscape',
      gradient: 'from-blue-500 to-indigo-500',
      videoDemo: true,
      highlights: [
        '最新の財務データをリアルタイム取得',
        'AIによる自動分析レポート生成',
        '複数企業の比較分析機能'
      ]
    },
    {
      icon: 'ri-file-text-line',
      title: '有価証券報告書まとめ',
      description: 'Claudeが有価証券報告書から重要な情報を自動抽出し、分かりやすくまとめます',
      image: 'https://readdy.ai/api/search-image?query=Professional%20financial%20document%20analysis%20with%20Claude%20AI%20interface%2C%20sophisticated%20document%20processing%20visualization%2C%20clean%20white%20background%20with%20blue%20and%20orange%20accents%2C%20modern%20AI-powered%20document%20summarization%20technology%2C%20organized%20financial%20reports%20layout&width=400&height=300&seq=feature2&orientation=landscape',
      gradient: 'from-orange-500 to-red-500',
      highlights: [
        '重要項目の自動抽出',
        'エグゼクティブサマリー作成',
        'リスク要因の可視化'
      ]
    },
    {
      icon: 'ri-database-2-line',
      title: '有価証券報告書データ加工',
      description: 'Claudeによる自動データ加工で、複雑な有価証券報告書データを使いやすい形式に変換',
      image: 'https://readdy.ai/api/search-image?query=Advanced%20data%20processing%20and%20transformation%20interface%20powered%20by%20Claude%20AI%2C%20sophisticated%20financial%20data%20visualization%20with%20clean%20modern%20design%2C%20organized%20data%20tables%20and%20charts%2C%20professional%20fintech%20environment%20with%20white%20and%20blue%20color%20scheme&width=400&height=300&seq=feature3&orientation=landscape',
      gradient: 'from-green-500 to-emerald-500',
      highlights: [
        '構造化データへの自動変換',
        'ExcelやCSVエクスポート',
        'カスタマイズ可能な出力形式'
      ]
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

        {/* Featured Section with Video */}
        <div className="mb-16 bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Left side - Feature Details */}
            <div className="p-12">
              <div className="flex items-center mb-6">
                <div className={`w-14 h-14 bg-gradient-to-br ${features[activeFeature].gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <i className={`${features[activeFeature].icon} text-white text-2xl`}></i>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 ml-4">
                  {features[activeFeature].title}
                </h3>
              </div>

              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                {features[activeFeature].description}
              </p>

              <ul className="space-y-4 mb-8">
                {features[activeFeature].highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start">
                    <i className="ri-check-double-line text-green-500 text-xl mr-3 mt-1"></i>
                    <span className="text-gray-700">{highlight}</span>
                  </li>
                ))}
              </ul>

              <div className="flex space-x-4">
                {features[activeFeature].videoDemo && (
                  <button
                    onClick={() => setShowVideo(!showVideo)}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <i className="ri-play-circle-line text-xl mr-2"></i>
                    {showVideo ? 'イメージを表示' : 'デモを見る'}
                  </button>
                )}
                <Link href="/demo">
                  <button className="flex items-center px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300">
                    <i className="ri-arrow-right-line text-xl mr-2"></i>
                    詳細を見る
                  </button>
                </Link>
              </div>
            </div>

            {/* Right side - Video or Image */}
            <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
              {showVideo && features[activeFeature].videoDemo ? (
                <div className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden shadow-inner">
                  <VideoPlayer
                    videoUrl="/videos/demo.mp4"
                    autoPlay={false}
                    controls={true}
                    muted={true}
                    width="100%"
                    height="100%"
                  />
                </div>
              ) : (
                <Image
                  src={features[activeFeature].image}
                  alt={features[activeFeature].title}
                  width={600}
                  height={400}
                  className="w-full h-auto rounded-2xl shadow-lg"
                  priority
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                />
              )}
            </div>
          </div>
        </div>

        {/* Feature Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              onClick={() => {
                setActiveFeature(index);
                setShowVideo(false);
              }}
              className={`group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
                activeFeature === index
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start">
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300`}>
                  <i className={`${feature.icon} text-white text-xl`}></i>
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {feature.description}
                  </p>
                  {feature.videoDemo && (
                    <div className="flex items-center mt-3">
                      <i className="ri-play-circle-line text-blue-600 text-sm mr-1"></i>
                      <span className="text-xs text-blue-600 font-medium">デモ動画あり</span>
                    </div>
                  )}
                </div>
              </div>
              {activeFeature === index && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              )}
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
            <Link href="/pricing">
              <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 cursor-pointer whitespace-nowrap shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                <i className="ri-vip-crown-line mr-2"></i>
                スタンダードを試す
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}