'use client';

import VideoPlayer from './VideoPlayer';
import { useLanguage } from '@/contexts/LanguageContext';

interface SearchDemoProps {
  defaultSearchTerm?: string;
  apiEndpoint?: string;
  demoMode?: boolean;
}

export default function SearchDemo({
  defaultSearchTerm = 'トヨタ自動車',
  apiEndpoint = '/api/v1/companies/',
  demoMode = true
}: SearchDemoProps) {
  // Language hook
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl" aria-hidden="true"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl" aria-hidden="true"></div>

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-full mb-6">
            <i className="ri-code-s-slash-line text-blue-600 mr-2" aria-hidden="true"></i>
            <span className="text-blue-700 text-sm font-medium">{t('home.searchDemo.badge')}</span>
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('home.searchDemo.title')}
            </span>
            {t('home.searchDemo.titleSuffix')}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('home.searchDemo.subtitle')}
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Video Display */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Video Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <i className="ri-play-circle-line text-white text-lg" aria-hidden="true"></i>
                    </div>
                    <span className="text-white font-semibold text-lg">{t('home.searchDemo.videoHeader')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Player */}
            <div className="bg-gray-900 p-4">
              <VideoPlayer
                videoUrl="/videos/demo.mp4"
                autoPlay={false}
                controls={true}
                muted={true}
                width="100%"
                height="600"
              />
            </div>

            {/* Video Description */}
            <div className="p-6 bg-gradient-to-b from-gray-50 to-white">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <i className="ri-information-line text-white text-xl" aria-hidden="true"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{t('home.searchDemo.demoVideoTitle')}</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {t('home.searchDemo.demoVideoDescription')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="flex items-start space-x-3">
                  <i className="ri-check-double-line text-green-500 text-xl mt-1" aria-hidden="true"></i>
                  <div>
                    <p className="font-semibold text-gray-800">{t('home.searchDemo.realtimeData')}</p>
                    <p className="text-sm text-gray-600">{t('home.searchDemo.realtimeDataDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <i className="ri-check-double-line text-green-500 text-xl mt-1" aria-hidden="true"></i>
                  <div>
                    <p className="font-semibold text-gray-800">{t('home.searchDemo.aiAnalysis')}</p>
                    <p className="text-sm text-gray-600">{t('home.searchDemo.aiAnalysisDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <i className="ri-check-double-line text-green-500 text-xl mt-1" aria-hidden="true"></i>
                  <div>
                    <p className="font-semibold text-gray-800">{t('home.searchDemo.easyApi')}</p>
                    <p className="text-sm text-gray-600">{t('home.searchDemo.easyApiDesc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features highlight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <i className="ri-robot-2-line text-white text-xl" aria-hidden="true"></i>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{t('home.searchDemo.feature1.title')}</h3>
              <p className="text-gray-600 text-sm">{t('home.searchDemo.feature1.desc')}</p>
            </div>

            <div className="text-center p-6 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <i className="ri-database-2-line text-white text-xl" aria-hidden="true"></i>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{t('home.searchDemo.feature2.title')}</h3>
              <p className="text-gray-600 text-sm">{t('home.searchDemo.feature2.desc')}</p>
            </div>

            <div className="text-center p-6 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <i className="ri-speed-line text-white text-xl" aria-hidden="true"></i>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{t('home.searchDemo.feature3.title')}</h3>
              <p className="text-gray-600 text-sm">{t('home.searchDemo.feature3.desc')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}