'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DocsNavigation() {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    {
      id: 'getting-started',
      title: t('docs.section.gettingStarted'),
      icon: 'ri-rocket-line',
      items: [
        { id: 'introduction', title: t('docs.section.gettingStarted.introduction') },
        { id: 'quick-start', title: t('docs.section.gettingStarted.quickStart') },
        { id: 'authentication', title: t('docs.section.gettingStarted.authentication') }
      ]
    },
    {
      id: 'api-reference',
      title: t('docs.section.apiReference'),
      icon: 'ri-code-line',
      items: [
        { id: 'companies', title: t('docs.section.apiReference.companies') },
        { id: 'financials', title: t('docs.section.apiReference.financials') },
        { id: 'analysis', title: t('docs.section.apiReference.analysis') }
      ]
    },
    {
      id: 'guides',
      title: t('docs.section.guides'),
      icon: 'ri-book-line',
      items: [
        { id: 'data-analysis', title: t('docs.section.guides.dataAnalysis') },
        { id: 'reporting', title: t('docs.section.guides.reporting') },
        { id: 'automation', title: t('docs.section.guides.automation') }
      ]
    },
    {
      id: 'examples',
      title: t('docs.section.examples'),
      icon: 'ri-lightbulb-line',
      items: [
        { id: 'python', title: t('docs.section.examples.python') },
        { id: 'javascript', title: t('docs.section.examples.javascript') },
        { id: 'curl', title: t('docs.section.examples.curl') }
      ]
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('docs.nav.tableOfContents')}</h3>

      <nav className="space-y-1">
        {sections.map((section) => (
          <div key={section.id}>
            <button
              onClick={() => setActiveSection(activeSection === section.id ? '' : section.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors cursor-pointer ${
                activeSection === section.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <i className={`${section.icon} text-lg`}></i>
                <span className="font-medium">{section.title}</span>
              </div>
              <i className={`ri-arrow-down-s-line transition-transform ${
                activeSection === section.id ? 'rotate-180' : ''
              }`}></i>
            </button>

            {activeSection === section.id && (
              <div className="ml-9 mt-2 space-y-1">
                {section.items.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block py-2 px-3 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="mt-8 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <i className="ri-question-line text-white text-sm"></i>
          </div>
          <h4 className="font-medium text-blue-900">{t('docs.nav.support')}</h4>
        </div>
        <p className="text-sm text-blue-700 mb-3">
          {t('docs.nav.support.description')}
        </p>
        <a href="mailto:support@xbrl-api.com?subject=APIドキュメントについてのお問い合わせ" className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap text-center block">
          {t('docs.nav.support.contact')}
        </a>
      </div>
    </div>
  );
}