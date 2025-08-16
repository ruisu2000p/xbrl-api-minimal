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
      description: '企業一覧を取征E,
      parameters: [
        { name: 'limit', type: 'integer', required: false, description: '取得件数�E�デフォルチE 100、最大: 1000�E�E },
        { name: 'offset', type: 'integer', required: false, description: 'オフセチE���E��Eージネ�Eション用�E�E },
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
      description: '企業詳細惁E��を取征E,
      parameters: [
        { name: 'company_id', type: 'string', required: true, description: '企業ID�E�侁E S100LO6W�E�E }
      ],
      response: `{
  "data": {
    "company_id": "S100LO6W",
    "name": "トヨタ自動車株式会社",
    "ticker": "7203",
    "sector": "輸送用機器",
    "market": "東証プライム",
    "fiscal_year_end": "3朁E,
    "employees": 375235,
    "headquarters": "愛知県豊田币E,
    "website": "https://www.toyota.co.jp"
  }
}`
    },
    financial: {
      method: 'GET',
      path: '/api/v1/financial',
      description: '財務データを取征E,
      parameters: [
        { name: 'company_id', type: 'string', required: true, description: '企業ID' },
        { name: 'year', type: 'integer', required: false, description: '年度�E�侁E 2023�E�E },
        { name: 'period', type: 'string', required: false, description: '期間�E�Ennual/quarterly�E�E }
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
      description: '有価証券報告書セクションを取征E,
      parameters: [
        { name: 'company_id', type: 'string', required: true, description: '企業ID' },
        { name: 'year', type: 'integer', required: true, description: '年度' },
        { name: 'section', type: 'string', required: false, description: 'セクション番号�E�侁E 0101010�E�E }
      ],
      response: `{
  "data": {
    "company_id": "S100LO6W",
    "year": 2023,
    "section": "0101010",
    "title": "企業の概況E,
    "content": "当社グループ�E、�E動車事業を中忁E��...",
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
        { name: 'type', type: 'string', required: false, description: '検索タイプ！Eame/ticker/sector�E�E }
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
      alert('APIキーを�E力してください');
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
                ↁE戻めE              </button>
              <h1 className="text-xl font-bold">APIドキュメンチE/h1>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              ダチE��ュボ�EチE            </button>
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
                エンド�EインチE              </button>
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
                レート制陁E              </button>
              <button
                onClick={() => setActiveSection('webhooks')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'webhooks' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                Webhook
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

          {/* メインコンチE��チE*/}
          <main className="flex-1 max-w-4xl">
            <div className="bg-white rounded-xl shadow-sm p-8">
              {activeSection === 'introduction' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">XBRL財務データAPI v1.0</h1>
                  
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                    <p className="text-blue-700">
                      日本の上場企業4,231社の有価証券報告書チE�Eタに簡単にアクセスできる、E��速で信頼性の高いAPIです、E                    </p>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">基本惁E��</h2>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 font-medium w-1/3">ベ�EスURL</td>
                        <td className="py-2"><code className="bg-gray-100 px-2 py-1 rounded">https://api.xbrl.jp/v1</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">プロトコル</td>
                        <td className="py-2">HTTPS</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">レスポンス形弁E/td>
                        <td className="py-2">JSON</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">斁E��エンコーチE��ング</td>
                        <td className="py-2">UTF-8</td>
                      </tr>
                    </tbody>
                  </table>

                  <h2 className="text-2xl font-bold mt-8 mb-4">クイチE��スターチE/h2>
                  <div className="bg-gray-900 rounded-lg p-4 text-white">
                    <div className="text-sm text-gray-400 mb-2"># 企業一覧を取征E/div>
                    <code className="text-green-400">
                      curl -H "X-API-Key: YOUR_API_KEY" \<br />
                      &nbsp;&nbsp;https://api.xbrl.jp/v1/companies
                    </code>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">主な機�E</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>4,231社の日本企業チE�Eタへのアクセス</li>
                    <li>20年刁E�E財務データ履歴</li>
                    <li>有価証券報告書の全セクション</li>
                    <li>リアルタイムチE�Eタ更新</li>
                    <li>高度な検索・フィルタリング機�E</li>
                    <li>Webhook対応！Eroプラン�E�E/li>
                  </ul>
                </div>
              )}

              {activeSection === 'authentication' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">認証</h1>
                  
                  <p className="mb-6">
                    XBRL財務データAPIは、APIキーベ�Eスの認証を使用します。すべてのAPIリクエストには、有効なAPIキーを�EチE��ーに含める忁E��があります、E                  </p>

                  <h2 className="text-2xl font-bold mt-8 mb-4">APIキーの取征E/h2>
                  <ol className="list-decimal pl-6 space-y-2 mb-6">
                    <li>アカウントを作�Eまた�Eログイン</li>
                    <li>ダチE��ュボ�Eドから「APIキー」セクションへ移勁E/li>
                    <li>「新しいAPIキーを生成」をクリチE��</li>
                    <li>生�Eされたキーを安�Eな場所に保孁E/li>
                  </ol>

                  <h2 className="text-2xl font-bold mt-8 mb-4">認証方況E/h2>
                  <p className="mb-4">APIキーは <code className="bg-gray-100 px-2 py-1 rounded">X-API-Key</code> ヘッダーに含めてください�E�E/p>
                  
                  <div className="bg-gray-900 rounded-lg p-4 text-white mb-6">
                    <code className="text-green-400">
                      curl -H "X-API-Key: sk_test_abc123xyz789" \<br />
                      &nbsp;&nbsp;https://api.xbrl.jp/v1/companies
                    </code>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">セキュリチE��のベスト�EラクチE��ス</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>APIキーを�E開リポジトリにコミットしなぁE/li>
                    <li>クライアントサイド�EコードにAPIキーを含めなぁE/li>
                    <li>環墁E��数を使用してAPIキーを管琁E/li>
                    <li>定期皁E��APIキーをローチE�Eション</li>
                    <li>不要になったAPIキーは削除</li>
                  </ul>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
                    <p className="text-yellow-700">
                      <strong>⚠�E�E重要E</strong> APIキーが漏洩した場合�E、直ちにダチE��ュボ�Eドから無効化し、新しいキーを生成してください、E                    </p>
                  </div>
                </div>
              )}

              {activeSection === 'endpoints' && (
                <div className="space-y-8">
                  <h1 className="text-3xl font-bold mb-6">APIエンド�EインチE/h1>
                  
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
                        {key === 'documents' && 'ドキュメンチE}
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
                            <th className="text-left py-2">垁E/th>
                            <th className="text-left py-2">忁E��E/th>
                            <th className="text-left py-2">説昁E/th>
                          </tr>
                        </thead>
                        <tbody>
                          {endpoints[selectedEndpoint].parameters.map((param, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-2"><code className="bg-gray-100 px-2 py-1 rounded text-sm">{param.name}</code></td>
                              <td className="py-2 text-sm">{param.type}</td>
                              <td className="py-2">
                                {param.required ? (
                                  <span className="text-red-600 font-medium">忁E��E/span>
                                ) : (
                                  <span className="text-gray-500">任愁E/span>
                                )}
                              </td>
                              <td className="py-2 text-sm">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <h3 className="font-bold mb-4">レスポンス侁E/h3>
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
                            placeholder="APIキーを�E劁E
                            value={tryItApiKey}
                            onChange={(e) => setTryItApiKey(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg"
                          />
                          <button
                            onClick={handleTryIt}
                            disabled={isLoading}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isLoading ? 'リクエスト中...' : 'APIを実衁E}
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
                    APIは標準的なHTTPスチE�Eタスコードを使用してリクエスト�E成功また�E失敗を示します、E                  </p>

                  <h2 className="text-2xl font-bold mt-8 mb-4">HTTPスチE�EタスコーチE/h2>
                  <table className="w-full border-collapse mb-6">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-4">コーチE/th>
                        <th className="text-left py-2 px-4">意味</th>
                        <th className="text-left py-2 px-4">説昁E/th>
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
                        <td className="py-2 px-4">リクエストが不正です（パラメータエラーなど�E�E/td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">401</code></td>
                        <td className="py-2 px-4">Unauthorized</td>
                        <td className="py-2 px-4">APIキーが無効また�E未提供でぁE/td>
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
                        <td className="py-2 px-4">サーバ�Eエラーが発生しました</td>
                      </tr>
                    </tbody>
                  </table>

                  <h2 className="text-2xl font-bold mt-8 mb-4">エラーレスポンス形弁E/h2>
                  <div className="bg-gray-900 rounded-lg p-4 text-white mb-6">
                    <pre className="text-sm">
                      <code className="text-red-400">{`{
  "error": {
    "code": "invalid_api_key",
    "message": "提供されたAPIキーが無効でぁE,
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
                    <li><code className="bg-gray-100 px-2 py-1 rounded">missing_parameter</code> - 忁E��パラメータが不足</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">invalid_parameter</code> - パラメータの値が不正</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">rate_limit_exceeded</code> - レート制限趁E��</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">resource_not_found</code> - リソースが存在しなぁE/li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">internal_error</code> - サーバ�E冁E��エラー</li>
                  </ul>
                </div>
              )}

              {activeSection === 'ratelimits' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">レート制陁E/h1>
                  
                  <p className="mb-6">
                    APIの安定性とパフォーマンスを維持するため、�Eランに応じたレート制限を設けてぁE��す、E                  </p>

                  <h2 className="text-2xl font-bold mt-8 mb-4">プラン別制陁E/h2>
                  <table className="w-full border-collapse mb-6">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-4">プラン</th>
                        <th className="text-left py-2 px-4">月間リクエスチE/th>
                        <th className="text-left py-2 px-4">同時接続数</th>
                        <th className="text-left py-2 px-4">バ�EストレーチE/th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Free</td>
                        <td className="py-2 px-4">100囁E朁E/td>
                        <td className="py-2 px-4">1</td>
                        <td className="py-2 px-4">1囁E私E/td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Standard</td>
                        <td className="py-2 px-4">3,000囁E朁E/td>
                        <td className="py-2 px-4">5</td>
                        <td className="py-2 px-4">10囁E私E/td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Pro</td>
                        <td className="py-2 px-4">無制陁E/td>
                        <td className="py-2 px-4">20</td>
                        <td className="py-2 px-4">100囁E私E/td>
                      </tr>
                    </tbody>
                  </table>

                  <h2 className="text-2xl font-bold mt-8 mb-4">レート制限�EチE��ー</h2>
                  <p className="mb-4">すべてのAPIレスポンスには、現在のレート制限状態を示す�EチE��ーが含まれます！E/p>
                  
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
                    <li><code className="bg-gray-100 px-2 py-1 rounded">X-RateLimit-Reset</code> - リセチE��時刻�E�ENIXタイムスタンプ！E/li>
                  </ul>

                  <h2 className="text-2xl font-bold mt-8 mb-4">レート制限趁E��時�E対忁E/h2>
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <p className="text-red-700">
                      レート制限に達した場合、APIは <code className="bg-red-100 px-2 py-1 rounded">429 Too Many Requests</code> を返します、E                      <code className="bg-red-100 px-2 py-1 rounded">Retry-After</code> ヘッダーを確認して、次のリクエストまでの征E��時間を確認してください、E                    </p>
                  </div>
                </div>
              )}

              {activeSection === 'webhooks' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">Webhook</h1>
                  
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                    <p className="text-blue-700">
                      <strong>ℹ�E�E注愁E</strong> Webhook機�EはProプランでのみ利用可能です、E                    </p>
                  </div>

                  <p className="mb-6">
                    Webhookを使用すると、特定�Eイベントが発生したときに、指定したURLに自動的に通知を送信できます、E                  </p>

                  <h2 className="text-2xl font-bold mt-8 mb-4">対応イベンチE/h2>
                  <ul className="list-disc pl-6 space-y-2 mb-6">
                    <li><code className="bg-gray-100 px-2 py-1 rounded">company.created</code> - 新しい企業が追加されぁE/li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">document.updated</code> - ドキュメントが更新されぁE/li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">financial.published</code> - 新しい財務データが�E開された</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">rate_limit.warning</code> - レート制限�E80%に到遁E/li>
                  </ul>

                  <h2 className="text-2xl font-bold mt-8 mb-4">Webhookペイロード侁E/h2>
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

                  <h2 className="text-2xl font-bold mt-8 mb-4">Webhook署名�E検証</h2>
                  <p className="mb-4">セキュリチE��のため、すべてのWebhookリクエストにはHMAC-SHA256署名が含まれます！E/p>
                  
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

              {activeSection === 'changelog' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">変更履歴</h1>
                  
                  <div className="space-y-8">
                    <div className="border-l-4 border-blue-400 pl-4">
                      <h3 className="text-xl font-bold">v1.0.0 - 2025年1朁E4日</h3>
                      <p className="text-gray-600 mb-2">初回リリース</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>企業一覧・詳細APIの実裁E/li>
                        <li>財務データAPIの実裁E/li>
                        <li>ドキュメント取得APIの実裁E/li>
                        <li>検索APIの実裁E/li>
                        <li>Webhook機�E�E�Eroプラン�E�E/li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-green-400 pl-4">
                      <h3 className="text-xl font-bold">v0.9.0 - 2023年12朁E日</h3>
                      <p className="text-gray-600 mb-2">ベ�Eタ版リリース</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>限定ユーザーへのベ�EタチE��ト開姁E/li>
                        <li>基本皁E��API機�Eの実裁E/li>
                        <li>レート制限�E実裁E/li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-gray-400 pl-4">
                      <h3 className="text-xl font-bold">今後�E予宁E/h3>
                      <p className="text-gray-600 mb-2">開発中の機�E</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>GraphQL API対忁E/li>
                        <li>バッチ�E琁EPI</li>
                        <li>リアルタイムストリーミング</li>
                        <li>機械学習による予測刁E��API</li>
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
