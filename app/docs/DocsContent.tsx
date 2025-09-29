'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function DocsContent() {
  const { t } = useLanguage();
  const codeExamples = {
    python: `import requests

# APIキーを設定
api_key = "your_api_key_here"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

# 企業データを取得
response = requests.get(
    "https://api.example.com/v1/companies/7203",
    headers=headers
)

if response.status_code == 200:
    company_data = response.json()
    print(f"会社名: {company_data['name']}")
    print(f"業界: {company_data['industry']}")
else:
    print(f"エラー: {response.status_code}")`,

    javascript: `const apiKey = 'your_api_key_here';

const fetchCompanyData = async (companyId) => {
  try {
    const response = await fetch(\`https://api.example.com/v1/companies/\${companyId}\`, {
      headers: {
        'Authorization': \`Bearer \${apiKey}\`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('会社名:', data.name);
      console.log('業界:', data.industry);
      return data;
    } else {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
  } catch (error) {
    console.error('エラー:', error);
  }
};

// 使用例
fetchCompanyData('7203');`,

    curl: `# 企業データを取得
curl -X GET "https://api.example.com/v1/companies/7203" \\
  -H "Authorization: Bearer your_api_key_here" \\
  -H "Content-Type: application/json"

# 財務データを取得
curl -X GET "https://api.example.com/v1/companies/7203/financials?year=2023" \\
  -H "Authorization: Bearer your_api_key_here" \\
  -H "Content-Type: application/json"`
  };

  const endpoints = [
    {
      method: 'GET',
      path: '/v1/companies',
      description: t('docs.apiReference.endpoint1.description'),
      params: [
        { name: t('docs.apiReference.endpoint1.param1.name'), type: 'string', description: t('docs.apiReference.endpoint1.param1.description') },
        { name: t('docs.apiReference.endpoint1.param2.name'), type: 'string', description: t('docs.apiReference.endpoint1.param2.description') },
        { name: t('docs.apiReference.endpoint1.param3.name'), type: 'number', description: t('docs.apiReference.endpoint1.param3.description') }
      ]
    },
    {
      method: 'GET',
      path: '/v1/companies/{id}',
      description: t('docs.apiReference.endpoint2.description'),
      params: [
        { name: t('docs.apiReference.endpoint2.param1.name'), type: 'string', description: t('docs.apiReference.endpoint2.param1.description') }
      ]
    },
    {
      method: 'GET',
      path: '/v1/companies/{id}/financials',
      description: t('docs.apiReference.endpoint3.description'),
      params: [
        { name: t('docs.apiReference.endpoint3.param1.name'), type: 'string', description: t('docs.apiReference.endpoint3.param1.description') },
        { name: t('docs.apiReference.endpoint3.param2.name'), type: 'number', description: t('docs.apiReference.endpoint3.param2.description') },
        { name: t('docs.apiReference.endpoint3.param3.name'), type: 'number', description: t('docs.apiReference.endpoint3.param3.description') }
      ]
    }
  ];

  return (
    <div className="space-y-8">
      {/* はじめに */}
      <section id="introduction" className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('docs.introduction.title')}</h2>
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700 leading-relaxed mb-4">
            {t('docs.introduction.description1')}
            {t('docs.introduction.description2')}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <i className="ri-information-line text-blue-600 mt-0.5"></i>
              <div>
                <h4 className="font-medium text-blue-800">{t('docs.introduction.features.title')}</h4>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• {t('docs.introduction.features.item1')}</li>
                  <li>• {t('docs.introduction.features.item2')}</li>
                  <li>• {t('docs.introduction.features.item3')}</li>
                  <li>• {t('docs.introduction.features.item4')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* クイックスタート */}
      <section id="quick-start" className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('docs.quickstart.title')}</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('docs.quickstart.step1.title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('docs.quickstart.step1.description')}
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <i className="ri-arrow-right-line"></i>
                <span>{t('docs.quickstart.step1.path')}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('docs.quickstart.step2.title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('docs.quickstart.step2.description')}
            </p>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm">
                <code>{codeExamples.curl.split('\n').slice(0, 4).join('\n')}</code>
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('docs.quickstart.step3.title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('docs.quickstart.step3.description')}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-700">
{`{
  "status": "success",
  "data": {
    "id": "7203",
    "name": "トヨタ自動車株式会社",
    "industry": "輸送用機器",
    "market": "プライム",
    "founded": "1937-08-28",
    "financials": {
      "revenue": 31367081000000,
      "profit": 2421139000000,
      "assets": 48750662000000
    }
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* 認証 */}
      <section id="authentication" className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('docs.authentication.title')}</h2>

        <div className="space-y-4">
          <p className="text-gray-700">
            {t('docs.authentication.description')}
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <i className="ri-shield-keyhole-line text-yellow-600 mt-0.5"></i>
              <div>
                <h4 className="font-medium text-yellow-800">{t('docs.authentication.security.title')}</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  {t('docs.authentication.security.description')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 text-sm">
              <code>Authorization: Bearer your_api_key_here</code>
            </pre>
          </div>
        </div>
      </section>

      {/* API リファレンス */}
      <section id="api-reference" className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('docs.apiReference.title')}</h2>

        <div className="space-y-6">
          {endpoints.map((endpoint, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  endpoint.method === 'GET'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {endpoint.method}
                </span>
                <code className="text-lg font-mono text-gray-900">{endpoint.path}</code>
              </div>

              <p className="text-gray-700 mb-4">{endpoint.description}</p>

              {endpoint.params.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">{t('docs.apiReference.parameters')}</h4>
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('docs.apiReference.parameterTable.name')}</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('docs.apiReference.parameterTable.type')}</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('docs.apiReference.parameterTable.description')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {endpoint.params.map((param, paramIndex) => (
                          <tr key={paramIndex}>
                            <td className="px-4 py-2 text-sm font-mono text-gray-900">{param.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{param.type}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{param.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 使用例 */}
      <section id="examples" className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('docs.examples.title')}</h2>

        <div className="space-y-8">
          {Object.entries(codeExamples).map(([language, code]) => (
            <div key={language}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <i className={`ri-${language === 'python' ? 'terminal' : language === 'javascript' ? 'javascript' : 'code'}-line text-gray-600`}></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {language === 'javascript' ? 'JavaScript' : language === 'python' ? 'Python' : 'cURL'}
                </h3>
              </div>
              <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
                <pre className="text-green-400 text-sm">
                  <code>{code}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* データ分析ガイド */}
      <section id="data-analysis" className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('docs.dataAnalysis.title')}</h2>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <i className="ri-brain-line text-white text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900">{t('docs.dataAnalysis.claude.title')}</h3>
                <p className="text-blue-700">{t('docs.dataAnalysis.claude.description')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">{t('docs.dataAnalysis.feature1.title')}</h4>
                <p className="text-sm text-blue-700">{t('docs.dataAnalysis.feature1.description')}</p>
              </div>
              <div className="bg-white/50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">{t('docs.dataAnalysis.feature2.title')}</h4>
                <p className="text-sm text-blue-700">{t('docs.dataAnalysis.feature2.description')}</p>
              </div>
              <div className="bg-white/50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">{t('docs.dataAnalysis.feature3.title')}</h4>
                <p className="text-sm text-blue-700">{t('docs.dataAnalysis.feature3.description')}</p>
              </div>
              <div className="bg-white/50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">{t('docs.dataAnalysis.feature4.title')}</h4>
                <p className="text-sm text-blue-700">{t('docs.dataAnalysis.feature4.description')}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('docs.dataAnalysis.usage.title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <i className="ri-line-chart-line text-green-600"></i>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">{t('docs.dataAnalysis.usage1.title')}</h4>
                <p className="text-sm text-gray-600">
                  {t('docs.dataAnalysis.usage1.description')}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                  <i className="ri-file-chart-line text-purple-600"></i>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">{t('docs.dataAnalysis.usage2.title')}</h4>
                <p className="text-sm text-gray-600">
                  {t('docs.dataAnalysis.usage2.description')}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                  <i className="ri-alarm-warning-line text-orange-600"></i>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">{t('docs.dataAnalysis.usage3.title')}</h4>
                <p className="text-sm text-gray-600">
                  {t('docs.dataAnalysis.usage3.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* よくある質問 */}
      <section className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('docs.faq.title')}</h2>

        <div className="space-y-4">
          {[
            {
              question: t('docs.faq.q1'),
              answer: t('docs.faq.a1')
            },
            {
              question: t('docs.faq.q2'),
              answer: t('docs.faq.a2')
            },
            {
              question: t('docs.faq.q3'),
              answer: t('docs.faq.a3')
            },
            {
              question: t('docs.faq.q4'),
              answer: t('docs.faq.a4')
            }
          ].map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">{faq.question}</h4>
              <p className="text-sm text-gray-700">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}