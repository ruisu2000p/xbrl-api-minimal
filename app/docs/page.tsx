'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DocsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('introduction');
  const [tryItApiKey, setTryItApiKey] = useState('');
  const [tryItResponse, setTryItResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const endpoints: Record<string, {
    method: string;
    path: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
    }>;
    response: string;
  }> = {
    companies: {
      method: 'GET',
      path: '/api/v1/companies',
      description: '企業一覧を取得',
      parameters: [
        { name: 'limit', type: 'integer', required: false, description: '取得件数 (デフォルト: 100、最大: 1000)' },
        { name: 'offset', type: 'integer', required: false, description: 'オフセット (ページネーション用)' },
        { name: 'sector', type: 'string', required: false, description: '業種でフィルタリング' }
      ],
      response: `{
  "data": [
    {
      "company_id": "S100LO6W",
      "name": "トヨタ自動車株式会社",
      "ticker": "7203",
      "sector": "輸送用機器",
      "market": "東証プライム"
    },
    ...
  ],
  "meta": {
    "total": 4231,
    "limit": 100,
    "offset": 0
  }
}`
    },
    companyDetail: {
      method: 'GET',
      path: '/api/v1/companies/{company_id}',
      description: '企業詳細情報を取得',
      parameters: [
        { name: 'company_id', type: 'string', required: true, description: '企業ID (例: S100LO6W)' }
      ],
      response: `{
  "data": {
    "company_id": "S100LO6W",
    "name": "トヨタ自動車株式会社",
    "ticker": "7203",
    "sector": "輸送用機器",
    "market": "東証プライム",
    "fiscal_year_end": "3月",
    "employees": 375235,
    "headquarters": "愛知県豊田市",
    "website": "https://www.toyota.co.jp"
  }
}`
    },
    financial: {
      method: 'GET',
      path: '/api/v1/financial',
      description: '財務データを取得',
      parameters: [
        { name: 'company_id', type: 'string', required: true, description: '企業ID' },
        { name: 'year', type: 'integer', required: false, description: '年度 (例: 2023)' },
        { name: 'period', type: 'string', required: false, description: '期間 (annual/quarterly)' }
      ],
      response: `{
  "data": {
    "company_id": "S100LO6W",
    "year": 2023,
    "revenue": 37154298000000,
    "operating_income": 2725356000000,
    "net_income": 2451318000000,
    "total_assets": 67688771000000,
    "shareholders_equity": 27539619000000,
    "roe": 0.089,
    "roa": 0.036
  }
}`
    },
    documents: {
      method: 'GET',
      path: '/api/v1/documents',
      description: '有価証券報告書セクションを取得',
      parameters: [
        { name: 'company_id', type: 'string', required: true, description: '企業ID' },
        { name: 'year', type: 'integer', required: true, description: '年度' },
        { name: 'section', type: 'string', required: false, description: 'セクション番号 (例: 0101010)' }
      ],
      response: `{
  "data": {
    "company_id": "S100LO6W",
    "year": 2023,
    "section": "0101010",
    "title": "企業の概況",
    "content": "当社グループは、自動車事業を中心に...",
    "last_updated": "2023-06-28T09:00:00Z"
  }
}`
    },
    search: {
      method: 'GET',
      path: '/api/v1/search',
      description: '企業を検索',
      parameters: [
        { name: 'q', type: 'string', required: true, description: '検索クエリ' },
        { name: 'type', type: 'string', required: false, description: '検索タイプ (name/ticker/sector)' }
      ],
      response: `{
  "data": [
    {
      "company_id": "S100LO6W",
      "name": "トヨタ自動車株式会社",
      "ticker": "7203",
      "relevance": 0.98
    }
  ],
  "meta": {
    "query": "トヨタ",
    "total_results": 3
  }
}`
    }
  };

  const [selectedEndpoint, setSelectedEndpoint] = useState<keyof typeof endpoints>('companies');

  const handleTryIt = async () => {
    if (!tryItApiKey) {
      alert('APIキーを入力してください');
      return;
    }

    setIsLoading(true);
    setTryItResponse('');

    // シミュレートされたAPIレスポンス
    setTimeout(() => {
      const endpoint = endpoints[selectedEndpoint as keyof typeof endpoints];
      setTryItResponse(endpoint.response);
      setIsLoading(false);
    }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900">
                ← 戻る
              </button>
              <h1 className="text-xl font-bold">APIドキュメント</h1>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              ダッシュボード
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* サイドバー */}
          <aside className="w-64 flex-shrink-0">
            <nav className="sticky top-24 space-y-1">
              <button
                onClick={() => setActiveSection('introduction')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'introduction' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                はじめに
              </button>
              <button
                onClick={() => setActiveSection('authentication')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'authentication' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                認証
              </button>
              <button
                onClick={() => setActiveSection('endpoints')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'endpoints' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                エンドポイント
              </button>
              <button
                onClick={() => setActiveSection('errors')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'errors' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                エラーハンドリング
              </button>
              <button
                onClick={() => setActiveSection('ratelimits')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'ratelimits' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                レート制限
              </button>
              <button
                onClick={() => setActiveSection('webhooks')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'webhooks' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                Webhook
              </button>
              <button
                onClick={() => setActiveSection('claude-mcp')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'claude-mcp' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                Claude MCP連携
              </button>
              <button
                onClick={() => setActiveSection('changelog')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'changelog' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                変更履歴
              </button>
            </nav>
          </aside>

          {/* メインコンテンツ */}
          <main className="flex-1 max-w-4xl">
            <div className="bg-white rounded-xl shadow-sm p-8">
              {activeSection === 'introduction' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">XBRL財務データAPI v1.0</h1>
                  
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                    <p className="text-blue-700">
                      日本の上場企業4,231社の有価証券報告書データに簡単にアクセスできる、高速で信頼性の高いAPIです。                    </p>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">基本情報</h2>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 font-medium w-1/3">ベースURL</td>
                        <td className="py-2"><code className="bg-gray-100 px-2 py-1 rounded">https://api.xbrl.jp/v1</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">プロトコル</td>
                        <td className="py-2">HTTPS</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">レスポンス形式</td>
                        <td className="py-2">JSON</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">文字エンコーディング</td>
                        <td className="py-2">UTF-8</td>
                      </tr>
                    </tbody>
                  </table>

                  <h2 className="text-2xl font-bold mt-8 mb-4">クイックスタート</h2>
                  <div className="bg-gray-900 rounded-lg p-4 text-white">
                    <div className="text-sm text-gray-400 mb-2"># 企業一覧を取得</div>
                    <code className="text-green-400">
                      curl -H "X-API-Key: YOUR_API_KEY" \<br />
                      &nbsp;&nbsp;https://api.xbrl.jp/v1/companies
                    </code>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">利用可能なエンドポイント</h2>
                  <div className="space-y-4 mb-8">
                    <div className="border-l-4 border-green-400 pl-4">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">GET</span>
                        <code className="text-sm font-mono">/api/v1/companies</code>
                      </div>
                      <p className="text-sm text-gray-600">企業一覧を取得</p>
                    </div>
                    
                    <div className="border-l-4 border-green-400 pl-4">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">GET</span>
                        <code className="text-sm font-mono">/api/v1/companies/{'{id}'}</code>
                      </div>
                      <p className="text-sm text-gray-600">企業詳細を取得</p>
                    </div>
                    
                    <div className="border-l-4 border-blue-400 pl-4">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">POST</span>
                        <code className="text-sm font-mono">/api/v1/search</code>
                      </div>
                      <p className="text-sm text-gray-600">企業を検索</p>
                    </div>
                    
                    <div className="border-l-4 border-green-400 pl-4">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">GET</span>
                        <code className="text-sm font-mono">/api/v1/companies/{'{id}'}/financial</code>
                      </div>
                      <p className="text-sm text-gray-600">財務データを取得</p>
                    </div>
                    
                    <div className="border-l-4 border-green-400 pl-4">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">GET</span>
                        <code className="text-sm font-mono">/api/v1/companies/{'{id}'}/documents</code>
                      </div>
                      <p className="text-sm text-gray-600">有価証券報告書を取得</p>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">使用例</h2>
                  <div className="space-y-4 mb-8">
                    <div className="bg-gray-900 rounded-lg p-4 text-white">
                      <div className="text-sm text-gray-400 mb-2"># 企業一覧を取得</div>
                      <code className="text-green-400">
                        curl -H "Authorization: Bearer YOUR_API_KEY" \<br />
                        &nbsp;&nbsp;https://xbrl-api-minimal.vercel.app/api/v1/companies
                      </code>
                    </div>
                    
                    <div className="bg-gray-900 rounded-lg p-4 text-white">
                      <div className="text-sm text-gray-400 mb-2"># 特定企業の詳細を取得</div>
                      <code className="text-green-400">
                        curl -H "Authorization: Bearer YOUR_API_KEY" \<br />
                        &nbsp;&nbsp;https://xbrl-api-minimal.vercel.app/api/v1/companies/S100LO6W
                      </code>
                    </div>
                    
                    <div className="bg-gray-900 rounded-lg p-4 text-white">
                      <div className="text-sm text-gray-400 mb-2"># 企業を検索</div>
                      <code className="text-green-400">
                        curl -X POST \<br />
                        &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY" \<br />
                        &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                        &nbsp;&nbsp;-d '{`{"query": "トヨタ", "limit": 10}`}' \<br />
                        &nbsp;&nbsp;https://xbrl-api-minimal.vercel.app/api/v1/search
                      </code>
                    </div>
                    
                    <div className="bg-gray-900 rounded-lg p-4 text-white">
                      <div className="text-sm text-gray-400 mb-2"># 財務データを取得</div>
                      <code className="text-green-400">
                        curl -H "Authorization: Bearer YOUR_API_KEY" \<br />
                        &nbsp;&nbsp;https://xbrl-api-minimal.vercel.app/api/v1/companies/S100LO6W/financial?year=2021
                      </code>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">主な機能</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>4,231社の日本企業データへのアクセス</li>
                    <li>20年分の財務データ履歴</li>
                    <li>有価証券報告書の全セクション</li>
                    <li>リアルタイムデータ更新</li>
                    <li>高度な検索・フィルタリング機能</li>
                    <li>Webhook対応 (Proプラン)</li>
                    <li>Claude MCP連携対応</li>
                  </ul>
                </div>
              )}

              {activeSection === 'authentication' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">認証</h1>
                  
                  <p className="mb-6">
                    XBRL財務データAPIは、APIキーベースの認証を使用します。すべてのAPIリクエストには、有効なAPIキーをヘッダーに含める必要があります。                  </p>

                  <h2 className="text-2xl font-bold mt-8 mb-4">APIキーの取得</h2>
                  <ol className="list-decimal pl-6 space-y-2 mb-6">
                    <li>アカウントを作成またはログイン</li>
                    <li>ダッシュボードから「APIキー」セクションへ移動</li>
                    <li>「新しいAPIキーを生成」をクリック</li>
                    <li>生成されたキーを安全な場所に保存</li>
                  </ol>

                  <h2 className="text-2xl font-bold mt-8 mb-4">認証方法</h2>
                  <p className="mb-4">APIキーは <code className="bg-gray-100 px-2 py-1 rounded">X-API-Key</code> ヘッダーに含めてください。</p>
                  
                  <div className="bg-gray-900 rounded-lg p-4 text-white mb-6">
                    <code className="text-green-400">
                      curl -H "X-API-Key: sk_test_abc123xyz789" \<br />
                      &nbsp;&nbsp;https://api.xbrl.jp/v1/companies
                    </code>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">セキュリティのベストプラクティス</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>APIキーを公開リポジトリにコミットしない</li>
                    <li>クライアントサイドのコードにAPIキーを含めない</li>
                    <li>環境変数を使用してAPIキーを管理</li>
                    <li>定期的にAPIキーをローテーション</li>
                    <li>不要になったAPIキーは削除</li>
                  </ul>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
                    <p className="text-yellow-700">
                      <strong>⚠️ 重要</strong> APIキーが漏洩した場合は、直ちにダッシュボードから無効化し、新しいキーを生成してください。                    </p>
                  </div>
                </div>
              )}

              {activeSection === 'endpoints' && (
                <div className="space-y-8">
                  <h1 className="text-3xl font-bold mb-6">APIエンドポイント</h1>
                  
                  <div className="flex gap-4 mb-6">
                    {Object.keys(endpoints).map((key) => (
                      <button
                        key={key}
                        onClick={() => setSelectedEndpoint(key as keyof typeof endpoints)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          selectedEndpoint === key 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        {key === 'companies' && '企業一覧'}
                        {key === 'companyDetail' && '企業詳細'}
                        {key === 'financial' && '財務データ'}
                        {key === 'documents' && 'ドキュメント'}
                        {key === 'search' && '検索'}
                      </button>
                    ))}
                  </div>

                  <div className="border rounded-lg">
                    <div className="bg-gray-50 px-6 py-4 border-b">
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded text-sm font-bold ${
                          endpoints[selectedEndpoint].method === 'GET' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {endpoints[selectedEndpoint].method}
                        </span>
                        <code className="text-lg font-mono">{endpoints[selectedEndpoint].path}</code>
                      </div>
                      <p className="text-gray-600 mt-2">{endpoints[selectedEndpoint].description}</p>
                    </div>

                    <div className="p-6">
                      <h3 className="font-bold mb-4">パラメータ</h3>
                      <table className="w-full mb-6">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">名前</th>
                            <th className="text-left py-2">型</th>
                            <th className="text-left py-2">必須</th>
                            <th className="text-left py-2">説明</th>
                          </tr>
                        </thead>
                        <tbody>
                          {endpoints[selectedEndpoint].parameters.map((param, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-2"><code className="bg-gray-100 px-2 py-1 rounded text-sm">{param.name}</code></td>
                              <td className="py-2 text-sm">{param.type}</td>
                              <td className="py-2">
                                {param.required ? (
                                  <span className="text-red-600 font-medium">必須</span>
                                ) : (
                                  <span className="text-gray-500">任意</span>
                                )}
                              </td>
                              <td className="py-2 text-sm">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <h3 className="font-bold mb-4">レスポンス例</h3>
                      <div className="bg-gray-900 rounded-lg p-4 text-white overflow-x-auto">
                        <pre className="text-sm">
                          <code className="text-green-400">{endpoints[selectedEndpoint].response}</code>
                        </pre>
                      </div>

                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-bold mb-3">🚀 Try it out!</h4>
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="APIキーを入力"
                            value={tryItApiKey}
                            onChange={(e) => setTryItApiKey(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg"
                          />
                          <button
                            onClick={handleTryIt}
                            disabled={isLoading}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isLoading ? 'リクエスト中...' : 'APIを実行'}
                          </button>
                          {tryItResponse && (
                            <div className="bg-gray-900 rounded-lg p-4 text-white">
                              <pre className="text-sm overflow-x-auto">
                                <code className="text-green-400">{tryItResponse}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'errors' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">エラーハンドリング</h1>
                  
                  <p className="mb-6">
                    APIは標準的なHTTPステータスコードを使用してリクエストの成功または失敗を示します。                  </p>

                  <h2 className="text-2xl font-bold mt-8 mb-4">HTTPステータスコード</h2>
                  <table className="w-full border-collapse mb-6">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-4">コード</th>
                        <th className="text-left py-2 px-4">意味</th>
                        <th className="text-left py-2 px-4">説明</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-green-100 text-green-700 px-2 py-1 rounded">200</code></td>
                        <td className="py-2 px-4">OK</td>
                        <td className="py-2 px-4">リクエストが成功しました</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">400</code></td>
                        <td className="py-2 px-4">Bad Request</td>
                        <td className="py-2 px-4">リクエストが不正です（パラメータエラーなど）</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">401</code></td>
                        <td className="py-2 px-4">Unauthorized</td>
                        <td className="py-2 px-4">APIキーが無効または未提供です</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">403</code></td>
                        <td className="py-2 px-4">Forbidden</td>
                        <td className="py-2 px-4">アクセス権限がありません</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">404</code></td>
                        <td className="py-2 px-4">Not Found</td>
                        <td className="py-2 px-4">リソースが見つかりません</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-red-100 text-red-700 px-2 py-1 rounded">429</code></td>
                        <td className="py-2 px-4">Too Many Requests</td>
                        <td className="py-2 px-4">レート制限に達しました</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-red-100 text-red-700 px-2 py-1 rounded">500</code></td>
                        <td className="py-2 px-4">Internal Server Error</td>
                        <td className="py-2 px-4">サーバーエラーが発生しました</td>
                      </tr>
                    </tbody>
                  </table>

                  <h2 className="text-2xl font-bold mt-8 mb-4">エラーレスポンス形式</h2>
                  <div className="bg-gray-900 rounded-lg p-4 text-white mb-6">
                    <pre className="text-sm">
                      <code className="text-red-400">{`{
  "error": {
    "code": "invalid_api_key",
    "message": "提供されたAPIキーが無効です",
    "details": {
      "provided_key": "sk_test_***",
      "timestamp": "2024-01-14T12:34:56Z"
    }
  }
}`}</code>
                    </pre>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">エラーコード一覧</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><code className="bg-gray-100 px-2 py-1 rounded">invalid_api_key</code> - APIキーが無効</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">missing_parameter</code> - 必須パラメータが不足</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">invalid_parameter</code> - パラメータの値が不正</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">rate_limit_exceeded</code> - レート制限超過</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">resource_not_found</code> - リソースが存在しない</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">internal_error</code> - サーバー内部エラー</li>
                  </ul>
                </div>
              )}

              {activeSection === 'ratelimits' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">レート制限</h1>
                  
                  <p className="mb-6">
                    APIの安定性とパフォーマンスを維持するため、プランに応じたレート制限を設けています。                  </p>

                  <h2 className="text-2xl font-bold mt-8 mb-4">プラン別制限</h2>
                  <table className="w-full border-collapse mb-6">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-4">プラン</th>
                        <th className="text-left py-2 px-4">月間リクエスト</th>
                        <th className="text-left py-2 px-4">同時接続数</th>
                        <th className="text-left py-2 px-4">バーストレート</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Free</td>
                        <td className="py-2 px-4">100回/月</td>
                        <td className="py-2 px-4">1</td>
                        <td className="py-2 px-4">1回/秒</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Standard</td>
                        <td className="py-2 px-4">3,000回/月</td>
                        <td className="py-2 px-4">5</td>
                        <td className="py-2 px-4">10回/秒</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Pro</td>
                        <td className="py-2 px-4">無制限</td>
                        <td className="py-2 px-4">20</td>
                        <td className="py-2 px-4">100回/秒</td>
                      </tr>
                    </tbody>
                  </table>

                  <h2 className="text-2xl font-bold mt-8 mb-4">レート制限ヘッダー</h2>
                  <p className="mb-4">すべてのAPIレスポンスには、現在のレート制限状態を示すヘッダーが含まれます。</p>
                  
                  <div className="bg-gray-100 rounded-lg p-4 mb-6">
                    <code className="text-sm">
                      X-RateLimit-Limit: 3000<br />
                      X-RateLimit-Remaining: 2456<br />
                      X-RateLimit-Reset: 1704326400
                    </code>
                  </div>

                  <ul className="list-disc pl-6 space-y-2 mb-6">
                    <li><code className="bg-gray-100 px-2 py-1 rounded">X-RateLimit-Limit</code> - 現在の期間の最大リクエスト数</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">X-RateLimit-Remaining</code> - 残りのリクエスト数</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">X-RateLimit-Reset</code> - リセット時刻のUNIXタイムスタンプ</li>
                  </ul>

                  <h2 className="text-2xl font-bold mt-8 mb-4">レート制限超過時の対応</h2>
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <p className="text-red-700">
                      レート制限に達した場合、APIは <code className="bg-red-100 px-2 py-1 rounded">429 Too Many Requests</code> を返します。<br />
                      <code className="bg-red-100 px-2 py-1 rounded">Retry-After</code> ヘッダーを確認して、次のリクエストまでの待機時間を確認してください。                    </p>
                  </div>
                </div>
              )}

              {activeSection === 'webhooks' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">Webhook</h1>
                  
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                    <p className="text-blue-700">
                      <strong>ℹ️ 注意</strong> Webhook機能はProプランでのみ利用可能です。                    </p>
                  </div>

                  <p className="mb-6">
                    Webhookを使用すると、特定のイベントが発生したときに、指定したURLに自動的に通知を送信できます。                  </p>

                  <h2 className="text-2xl font-bold mt-8 mb-4">対応イベント</h2>
                  <ul className="list-disc pl-6 space-y-2 mb-6">
                    <li><code className="bg-gray-100 px-2 py-1 rounded">company.created</code> - 新しい企業が追加された</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">document.updated</code> - ドキュメントが更新された</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">financial.published</code> - 新しい財務データが公開された</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">rate_limit.warning</code> - レート制限の80%に到達</li>
                  </ul>

                  <h2 className="text-2xl font-bold mt-8 mb-4">Webhookペイロード例</h2>
                  <div className="bg-gray-900 rounded-lg p-4 text-white mb-6">
                    <pre className="text-sm">
                      <code className="text-green-400">{`{
  "event": "document.updated",
  "timestamp": "2024-01-14T12:34:56Z",
  "data": {
    "company_id": "S100LO6W",
    "company_name": "トヨタ自動車株式会社",
    "document_type": "有価証券報告書",
    "year": 2023,
    "section": "0101010",
    "changes": ["content", "last_updated"]
  }
}`}</code>
                    </pre>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">Webhook署名の検証</h2>
                  <p className="mb-4">セキュリティのため、すべてのWebhookリクエストにはHMAC-SHA256署名が含まれます。</p>
                  
                  <div className="bg-gray-900 rounded-lg p-4 text-white">
                    <pre className="text-sm">
                      <code className="text-green-400">{`const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return hash === signature;
}`}</code>
                    </pre>
                  </div>
                </div>
              )}

              {activeSection === 'claude-mcp' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">Claude MCP連携</h1>
                  
                  <div className="bg-purple-50 border-l-4 border-purple-400 p-4 mb-6">
                    <p className="text-purple-700">
                      Claude Desktop アプリケーションから直接XBRL財務データAPIにアクセスできます。
                      MCPサーバーを使用することで、自然言語で財務データを取得・分析できます。
                    </p>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">セットアップ手順</h2>
                  
                  <h3 className="text-lg font-bold mt-6 mb-3">1. APIキーの取得</h3>
                  <p className="mb-4">
                    まず、ダッシュボードからAPIキーを取得してください。
                  </p>
                  <div className="bg-gray-100 rounded-lg p-4 mb-6">
                    <code className="text-sm">xbrl_live_xxxxxxxxxxxxxxxxxxxxxx</code>
                  </div>

                  <h3 className="text-lg font-bold mt-6 mb-3">2. MCPサーバーファイルの作成</h3>
                  <p className="mb-4">
                    以下のコードを <code className="bg-gray-100 px-2 py-1 rounded">mcp-xbrl-server.js</code> として保存します。
                  </p>
                  <div className="bg-gray-900 rounded-lg p-4 text-white overflow-x-auto mb-6">
                    <pre className="text-sm">
                      <code className="text-green-400">{`#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

const API_KEY = process.env.XBRL_API_KEY;
const API_BASE_URL = 'https://xbrl-api-minimal.vercel.app/api/v1';

const server = new Server(
  {
    name: 'xbrl-api-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツールの定義
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'search_companies') {
    const { query, limit = 10 } = request.params.arguments || {};
    
    const response = await fetch(\`\${API_BASE_URL}/companies?q=\${query}&limit=\${limit}\`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
  
  if (request.params.name === 'get_financial_data') {
    const { company_id, year } = request.params.arguments || {};
    
    const response = await fetch(\`\${API_BASE_URL}/companies/\${company_id}/financial?year=\${year}\`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
  
  throw new Error(\`Unknown tool: \${request.params.name}\`);
});

// ツールリストの提供
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'search_companies',
        description: '企業名やティッカーで企業を検索',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '検索キーワード' },
            limit: { type: 'number', description: '取得件数（デフォルト: 10）' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_financial_data',
        description: '特定企業の財務データを取得',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: '企業ID' },
            year: { type: 'number', description: '年度' },
          },
          required: ['company_id'],
        },
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);`}</code>
                    </pre>
                  </div>

                  <h3 className="text-lg font-bold mt-6 mb-3">3. 依存関係のインストール</h3>
                  <div className="bg-gray-900 rounded-lg p-4 text-white mb-6">
                    <code className="text-green-400">
                      npm install @modelcontextprotocol/sdk node-fetch
                    </code>
                  </div>

                  <h3 className="text-lg font-bold mt-6 mb-3">4. Claude Desktop設定ファイルの編集</h3>
                  <p className="mb-4">
                    以下の場所にある設定ファイルを編集します：
                  </p>
                  
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                    <p className="text-yellow-700 font-semibold mb-2">📍 設定ファイルの場所</p>
                    <ul className="space-y-2">
                      <li>
                        <strong>Windows:</strong> 
                        <code className="bg-yellow-100 px-2 py-1 rounded text-sm">%APPDATA%\Claude\claude_desktop_config.json</code>
                      </li>
                      <li>
                        <strong>macOS:</strong> 
                        <code className="bg-yellow-100 px-2 py-1 rounded text-sm">~/Library/Application Support/Claude/claude_desktop_config.json</code>
                      </li>
                      <li>
                        <strong>Linux:</strong> 
                        <code className="bg-yellow-100 px-2 py-1 rounded text-sm">~/.config/Claude/claude_desktop_config.json</code>
                      </li>
                    </ul>
                  </div>
                  
                  <p className="mb-4">以下の内容を設定ファイルに追加します：</p>
                  <div className="bg-gray-900 rounded-lg p-4 text-white overflow-x-auto mb-4">
                    <pre className="text-sm">
                      <code className="text-green-400">{`{
  "mcpServers": {
    "xbrl-api": {
      "command": "node",
      "args": ["C:/path/to/mcp-xbrl-server.js"],
      "env": {
        "XBRL_API_KEY": "xbrl_live_xxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}`}</code>
                    </pre>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-blue-800 font-semibold mb-2">💡 設定のポイント</p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-blue-700">
                      <li><code className="bg-blue-100 px-1 rounded">C:/path/to/mcp-xbrl-server.js</code> を実際のファイルパスに置き換えてください</li>
                      <li><code className="bg-blue-100 px-1 rounded">xbrl_live_xxxxxxxxxxxxxxxxxxxxxx</code> をダッシュボードで取得したAPIキーに置き換えてください</li>
                      <li>Windowsの場合、パスは <code className="bg-blue-100 px-1 rounded">C:/</code> または <code className="bg-blue-100 px-1 rounded">C:\\</code> の形式で記述できます</li>
                      <li>既存の設定がある場合は、mcpServersセクションに追加してください</li>
                    </ul>
                  </div>

                  <h3 className="text-lg font-bold mt-6 mb-3">5. Claude Desktopを再起動</h3>
                  <p className="mb-6">
                    設定を反映させるため、Claude Desktopアプリケーションを再起動してください。
                  </p>

                  <h2 className="text-2xl font-bold mt-8 mb-4">使用方法</h2>
                  
                  <div className="bg-blue-50 rounded-lg p-6 mb-6">
                    <h3 className="font-bold mb-3">Claude Desktopでの使用例</h3>
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4">
                        <p className="font-semibold mb-2">例1: 企業検索</p>
                        <p className="text-gray-700 italic">
                          「トヨタ自動車の企業情報を検索してください」
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <p className="font-semibold mb-2">例2: 財務データ取得</p>
                        <p className="text-gray-700 italic">
                          「トヨタ自動車の2021年度の財務データを取得してください」
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <p className="font-semibold mb-2">例3: 複数企業の比較</p>
                        <p className="text-gray-700 italic">
                          「自動車メーカー5社の売上高を比較してください」
                        </p>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">利用可能なツール</h2>
                  
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-bold text-lg mb-2">search_companies</h3>
                      <p className="text-gray-600 mb-2">企業名やティッカーコードで企業を検索します。</p>
                      <div className="bg-gray-100 rounded p-3">
                        <p className="text-sm font-mono">
                          引数: query (文字列), limit (数値, オプション)
                        </p>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h3 className="font-bold text-lg mb-2">get_financial_data</h3>
                      <p className="text-gray-600 mb-2">特定企業の財務データを取得します。</p>
                      <div className="bg-gray-100 rounded p-3">
                        <p className="text-sm font-mono">
                          引数: company_id (文字列), year (数値, オプション)
                        </p>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h3 className="font-bold text-lg mb-2">get_document_sections</h3>
                      <p className="text-gray-600 mb-2">有価証券報告書の特定セクションを取得します。</p>
                      <div className="bg-gray-100 rounded p-3">
                        <p className="text-sm font-mono">
                          引数: company_id (文字列), section (文字列), year (数値, オプション)
                        </p>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">トラブルシューティング</h2>
                  
                  <div className="space-y-4">
                    <div className="border-l-4 border-yellow-400 pl-4">
                      <h3 className="font-bold mb-2">MCPサーバーが認識されない</h3>
                      <ul className="list-disc pl-6 text-sm space-y-1">
                        <li>設定ファイルのパスが正しいか確認してください</li>
                        <li>Node.jsが正しくインストールされているか確認してください</li>
                        <li>Claude Desktopを完全に再起動してください</li>
                      </ul>
                    </div>
                    
                    <div className="border-l-4 border-yellow-400 pl-4">
                      <h3 className="font-bold mb-2">APIキーエラー</h3>
                      <ul className="list-disc pl-6 text-sm space-y-1">
                        <li>APIキーが正しくコピーされているか確認してください</li>
                        <li>APIキーの有効期限を確認してください</li>
                        <li>レート制限に達していないか確認してください</li>
                      </ul>
                    </div>
                    
                    <div className="border-l-4 border-yellow-400 pl-4">
                      <h3 className="font-bold mb-2">データが取得できない</h3>
                      <ul className="list-disc pl-6 text-sm space-y-1">
                        <li>インターネット接続を確認してください</li>
                        <li>企業IDが正しいか確認してください</li>
                        <li>指定した年度のデータが存在するか確認してください</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
                    <h3 className="font-bold text-green-800 mb-2">サポート</h3>
                    <p className="text-green-700">
                      MCP連携に関するご質問は、
                      <a href="mailto:support@xbrl-api.jp" className="underline">support@xbrl-api.jp</a>
                      までお問い合わせください。
                    </p>
                  </div>
                </div>
              )}

              {activeSection === 'changelog' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">変更履歴</h1>
                  
                  <div className="space-y-8">
                    <div className="border-l-4 border-blue-400 pl-4">
                      <h3 className="text-xl font-bold">v1.0.0 - 2025年1月14日</h3>
                      <p className="text-gray-600 mb-2">初回リリース</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>企業一覧・詳細APIの実装</li>
                        <li>財務データAPIの実装</li>
                        <li>ドキュメント取得APIの実装</li>
                        <li>検索APIの実装</li>
                        <li>Webhook機能（Proプラン）</li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-green-400 pl-4">
                      <h3 className="text-xl font-bold">v0.9.0 - 2023年12月1日</h3>
                      <p className="text-gray-600 mb-2">ベ�Eタ版リリース</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>限定ユーザーへのベータテスト開始</li>
                        <li>基本的なAPI機能の実装</li>
                        <li>レート制限の実装</li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-gray-400 pl-4">
                      <h3 className="text-xl font-bold">今後の予定</h3>
                      <p className="text-gray-600 mb-2">開発中の機能</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>GraphQL API対応</li>
                        <li>バッチ処理API</li>
                        <li>リアルタイムストリーミング</li>
                        <li>機械学習による予測分析API</li>
                        <li>カスタムWebhookフィルター</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
