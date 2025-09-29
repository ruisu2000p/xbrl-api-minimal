'use client';

import DocsNavigation from './DocsNavigation';
import DocsContent from './DocsContent';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DocsPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('docs.page.title')}</h1>
          <p className="text-gray-600 mt-2">{t('docs.page.subtitle')}</p>
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