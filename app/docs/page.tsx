'use client';

import DocsNavigation from './DocsNavigation';
import DocsContent from './DocsContent';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';

export default function DocsPage() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('docs.page.title')}</h1>
            <p className="text-gray-600 mt-2">{t('docs.page.subtitle')}</p>
          </div>
          <button
            onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            aria-label="Switch language"
          >
            <i className="ri-translate-2 text-gray-600"></i>
            <span className="text-sm font-medium text-gray-700">{language === 'ja' ? 'EN' : 'JA'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <DocsNavigation />
          </div>
          <div className="lg:col-span-3">
            <DocsContent />
          </div>
        </div>
      </div>
    </div>
  );
}