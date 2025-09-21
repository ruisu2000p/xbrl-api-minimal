'use client';

export default function DocsContent() {
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
      description: '企業一覧を取得',
      params: [
        { name: 'industry', type: 'string', description: '業界でフィルタ（オプション）' },
        { name: 'market', type: 'string', description: '市場でフィルタ（オプション）' },
        { name: 'limit', type: 'number', description: '取得件数（デフォルト: 20）' }
      ]
    },
    {
      method: 'GET',
      path: '/v1/companies/{id}',
      description: '特定企業の詳細情報を取得',
      params: [
        { name: 'id', type: 'string', description: '企業ID（必須）' }
      ]
    },
    {
      method: 'GET',
      path: '/v1/companies/{id}/financials',
      description: '企業の財務データを取得',
      params: [
        { name: 'id', type: 'string', description: '企業ID（必須）' },
        { name: 'year', type: 'number', description: '対象年度（オプション）' },
        { name: 'quarter', type: 'number', description: '四半期（1-4、オプション）' }
      ]
    }
  ];

  return (
    <div className="space-y-8">
      {/* はじめに */}
      <section id="introduction" className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">概要</h2>
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700 leading-relaxed mb-4">
            財務データAPIは、日本の上場企業の財務情報や企業データにアクセスするためのRESTful APIです。
            有価証券報告書のデータをClaudeが解析し、構造化された形式で提供します。
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <i className="ri-information-line text-blue-600 mt-0.5"></i>
              <div>
                <h4 className="font-medium text-blue-800">主な機能</h4>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• 企業の基本情報とプロフィール</li>
                  <li>• 財務諸表データ（貸借対照表、損益計算書、キャッシュフロー計算書）</li>
                  <li>• Claudeによる財務分析とインサイト</li>
                  <li>• 有価証券報告書の自動要約</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* クイックスタート */}
      <section id="quick-start" className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">クイックスタート</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">1. APIキーの取得</h3>
            <p className="text-gray-700 mb-4">
              まず、ダッシュボードからAPIキーを作成してください。
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <i className="ri-arrow-right-line"></i>
                <span>ダッシュボード → アカウント設定 → APIキー → 新しいキーを作成</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">2. 最初のリクエスト</h3>
            <p className="text-gray-700 mb-4">
              企業データを取得する基本的な例：
            </p>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm">
                <code>{codeExamples.curl.split('\n').slice(0, 4).join('\n')}</code>
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">3. レスポンス形式</h3>
            <p className="text-gray-700 mb-4">
              APIは以下の形式でJSONレスポンスを返します：
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">認証</h2>

        <div className="space-y-4">
          <p className="text-gray-700">
            すべてのAPIリクエストには、HTTPヘッダーにBearerトークン形式でAPIキーを含める必要があります。
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <i className="ri-shield-keyhole-line text-yellow-600 mt-0.5"></i>
              <div>
                <h4 className="font-medium text-yellow-800">セキュリティについて</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  APIキーは機密情報です。クライアントサイドのコードに直接記述せず、
                  サーバーサイドまたは環境変数として安全に管理してください。
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">API リファレンス</h2>

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
                  <h4 className="font-medium text-gray-900 mb-3">パラメータ</h4>
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">名前</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">型</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">説明</th>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">使用例</h2>

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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">データ分析ガイド</h2>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <i className="ri-brain-line text-white text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Claudeによる分析機能</h3>
                <p className="text-blue-700">有価証券報告書を自動分析し、重要なインサイトを提供</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">財務分析</h4>
                <p className="text-sm text-blue-700">収益性、成長性、安全性の指標を自動計算</p>
              </div>
              <div className="bg-white/50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">リスク評価</h4>
                <p className="text-sm text-blue-700">企業の潜在的リスクを特定・評価</p>
              </div>
              <div className="bg-white/50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">業界比較</h4>
                <p className="text-sm text-blue-700">同業他社との詳細な比較分析</p>
              </div>
              <div className="bg-white/50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">予測モデル</h4>
                <p className="text-sm text-blue-700">将来の業績予測とシナリオ分析</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">分析データの活用方法</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <i className="ri-line-chart-line text-green-600"></i>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">投資判断</h4>
                <p className="text-sm text-gray-600">
                  財務指標と分析結果を基にした投資戦略の策定
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                  <i className="ri-file-chart-line text-purple-600"></i>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">レポート作成</h4>
                <p className="text-sm text-gray-600">
                  クライアント向けの詳細な財務分析レポート
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                  <i className="ri-alarm-warning-line text-orange-600"></i>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">リスク監視</h4>
                <p className="text-sm text-gray-600">
                  定期的な財務健全性チェックとアラート設定
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* よくある質問 */}
      <section className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">よくある質問</h2>

        <div className="space-y-4">
          {[
            {
              question: 'APIの利用制限はありますか？',
              answer: 'プランに応じて月間のリクエスト数に制限があります。スタンダードプランでは月間10,000リクエストまで利用可能です。'
            },
            {
              question: 'データの更新頻度はどのくらいですか？',
              answer: '有価証券報告書の提出後、通常24時間以内にデータが更新されます。四半期報告書は提出から48時間以内です。'
            },
            {
              question: 'どの企業のデータが利用できますか？',
              answer: '東証プライム、スタンダード、グロース市場に上場している全企業のデータを提供しています。'
            },
            {
              question: 'APIキーが漏洩した場合はどうすればよいですか？',
              answer: 'すぐにダッシュボードから該当のAPIキーを削除し、新しいAPIキーを作成してください。'
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