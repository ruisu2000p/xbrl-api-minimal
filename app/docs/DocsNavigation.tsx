'use client';

import { useState } from 'react';

export default function DocsNavigation() {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    {
      id: 'getting-started',
      title: 'はじめに',
      icon: 'ri-rocket-line',
      items: [
        { id: 'introduction', title: '概要' },
        { id: 'quick-start', title: 'クイックスタート' },
        { id: 'authentication', title: '認証' }
      ]
    },
    {
      id: 'api-reference',
      title: 'API リファレンス',
      icon: 'ri-code-line',
      items: [
        { id: 'companies', title: '企業データ' },
        { id: 'financials', title: '財務データ' },
        { id: 'analysis', title: '分析データ' }
      ]
    },
    {
      id: 'guides',
      title: 'ガイド',
      icon: 'ri-book-line',
      items: [
        { id: 'data-analysis', title: 'データ分析' },
        { id: 'reporting', title: 'レポート作成' },
        { id: 'automation', title: '自動化' }
      ]
    },
    {
      id: 'examples',
      title: '使用例',
      icon: 'ri-lightbulb-line',
      items: [
        { id: 'python', title: 'Python' },
        { id: 'javascript', title: 'JavaScript' },
        { id: 'curl', title: 'cURL' }
      ]
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">目次</h3>

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
          <h4 className="font-medium text-blue-900">サポート</h4>
        </div>
        <p className="text-sm text-blue-700 mb-3">
          ご不明な点がございましたら、お気軽にお問い合わせください。
        </p>
        <a href="mailto:support@xbrl-api.com?subject=APIドキュメントについてのお問い合わせ" className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap text-center block">
          サポートに連絡
        </a>
      </div>
    </div>
  );
}