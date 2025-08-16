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
      description: '莨∵･ｭ荳隕ｧ繧貞叙蠕・,
      parameters: [
        { name: 'limit', type: 'integer', required: false, description: '蜿門ｾ嶺ｻｶ謨ｰ・医ョ繝輔か繝ｫ繝・ 100縲∵怙螟ｧ: 1000・・ },
        { name: 'offset', type: 'integer', required: false, description: '繧ｪ繝輔そ繝・ヨ・医・繝ｼ繧ｸ繝阪・繧ｷ繝ｧ繝ｳ逕ｨ・・ },
        { name: 'sector', type: 'string', required: false, description: '讌ｭ遞ｮ縺ｧ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ' }
      ],
      response: `{
  "data": [
    {
      "company_id": "S100LO6W",
      "name": "繝医Κ繧ｿ閾ｪ蜍戊ｻ頑ｪ蠑丈ｼ夂､ｾ",
      "ticker": "7203",
      "sector": "霈ｸ騾∫畑讖溷勣",
      "market": "譚ｱ險ｼ繝励Λ繧､繝"
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
      description: '莨∵･ｭ隧ｳ邏ｰ諠・ｱ繧貞叙蠕・,
      parameters: [
        { name: 'company_id', type: 'string', required: true, description: '莨∵･ｭID・井ｾ・ S100LO6W・・ }
      ],
      response: `{
  "data": {
    "company_id": "S100LO6W",
    "name": "繝医Κ繧ｿ閾ｪ蜍戊ｻ頑ｪ蠑丈ｼ夂､ｾ",
    "ticker": "7203",
    "sector": "霈ｸ騾∫畑讖溷勣",
    "market": "譚ｱ險ｼ繝励Λ繧､繝",
    "fiscal_year_end": "3譛・,
    "employees": 375235,
    "headquarters": "諢帷衍逵瑚ｱ顔伐蟶・,
    "website": "https://www.toyota.co.jp"
  }
}`
    },
    financial: {
      method: 'GET',
      path: '/api/v1/financial',
      description: '雋｡蜍吶ョ繝ｼ繧ｿ繧貞叙蠕・,
      parameters: [
        { name: 'company_id', type: 'string', required: true, description: '莨∵･ｭID' },
        { name: 'year', type: 'integer', required: false, description: '蟷ｴ蠎ｦ・井ｾ・ 2023・・ },
        { name: 'period', type: 'string', required: false, description: '譛滄俣・・nnual/quarterly・・ }
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
      description: '譛我ｾ｡險ｼ蛻ｸ蝣ｱ蜻頑嶌繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ繧貞叙蠕・,
      parameters: [
        { name: 'company_id', type: 'string', required: true, description: '莨∵･ｭID' },
        { name: 'year', type: 'integer', required: true, description: '蟷ｴ蠎ｦ' },
        { name: 'section', type: 'string', required: false, description: '繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ逡ｪ蜿ｷ・井ｾ・ 0101010・・ }
      ],
      response: `{
  "data": {
    "company_id": "S100LO6W",
    "year": 2023,
    "section": "0101010",
    "title": "莨∵･ｭ縺ｮ讎よｳ・,
    "content": "蠖鍋､ｾ繧ｰ繝ｫ繝ｼ繝励・縲∬・蜍戊ｻ贋ｺ区･ｭ繧剃ｸｭ蠢・↓...",
    "last_updated": "2023-06-28T09:00:00Z"
  }
}`
    },
    search: {
      method: 'GET',
      path: '/api/v1/search',
      description: '莨∵･ｭ繧呈､懃ｴ｢',
      parameters: [
        { name: 'q', type: 'string', required: true, description: '讀懃ｴ｢繧ｯ繧ｨ繝ｪ' },
        { name: 'type', type: 'string', required: false, description: '讀懃ｴ｢繧ｿ繧､繝暦ｼ・ame/ticker/sector・・ }
      ],
      response: `{
  "data": [
    {
      "company_id": "S100LO6W",
      "name": "繝医Κ繧ｿ閾ｪ蜍戊ｻ頑ｪ蠑丈ｼ夂､ｾ",
      "ticker": "7203",
      "relevance": 0.98
    }
  ],
  "meta": {
    "query": "繝医Κ繧ｿ",
    "total_results": 3
  }
}`
    }
  };

  const [selectedEndpoint, setSelectedEndpoint] = useState<keyof typeof endpoints>('companies');

  const handleTryIt = async () => {
    if (!tryItApiKey) {
      alert('API繧ｭ繝ｼ繧貞・蜉帙＠縺ｦ縺上□縺輔＞');
      return;
    }

    setIsLoading(true);
    setTryItResponse('');

    // 繧ｷ繝溘Η繝ｬ繝ｼ繝医＆繧後◆API繝ｬ繧ｹ繝昴Φ繧ｹ
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
      {/* 繝倥ャ繝繝ｼ */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900">
                竊・謌ｻ繧・              </button>
              <h1 className="text-xl font-bold">API繝峨く繝･繝｡繝ｳ繝・/h1>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              繝繝・す繝･繝懊・繝・            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* 繧ｵ繧､繝峨ヰ繝ｼ */}
          <aside className="w-64 flex-shrink-0">
            <nav className="sticky top-24 space-y-1">
              <button
                onClick={() => setActiveSection('introduction')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'introduction' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                縺ｯ縺倥ａ縺ｫ
              </button>
              <button
                onClick={() => setActiveSection('authentication')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'authentication' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                隱崎ｨｼ
              </button>
              <button
                onClick={() => setActiveSection('endpoints')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'endpoints' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                繧ｨ繝ｳ繝峨・繧､繝ｳ繝・              </button>
              <button
                onClick={() => setActiveSection('errors')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'errors' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ
              </button>
              <button
                onClick={() => setActiveSection('ratelimits')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'ratelimits' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                繝ｬ繝ｼ繝亥宛髯・              </button>
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
                螟画峩螻･豁ｴ
              </button>
            </nav>
          </aside>

          {/* 繝｡繧､繝ｳ繧ｳ繝ｳ繝・Φ繝・*/}
          <main className="flex-1 max-w-4xl">
            <div className="bg-white rounded-xl shadow-sm p-8">
              {activeSection === 'introduction' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">XBRL雋｡蜍吶ョ繝ｼ繧ｿAPI v1.0</h1>
                  
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                    <p className="text-blue-700">
                      譌･譛ｬ縺ｮ荳雁ｴ莨∵･ｭ4,231遉ｾ縺ｮ譛我ｾ｡險ｼ蛻ｸ蝣ｱ蜻頑嶌繝・・繧ｿ縺ｫ邁｡蜊倥↓繧｢繧ｯ繧ｻ繧ｹ縺ｧ縺阪ｋ縲・ｫ倬溘〒菫｡鬆ｼ諤ｧ縺ｮ鬮倥＞API縺ｧ縺吶・                    </p>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">蝓ｺ譛ｬ諠・ｱ</h2>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 font-medium w-1/3">繝吶・繧ｹURL</td>
                        <td className="py-2"><code className="bg-gray-100 px-2 py-1 rounded">https://api.xbrl.jp/v1</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">繝励Ο繝医さ繝ｫ</td>
                        <td className="py-2">HTTPS</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">繝ｬ繧ｹ繝昴Φ繧ｹ蠖｢蠑・/td>
                        <td className="py-2">JSON</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">譁・ｭ励お繝ｳ繧ｳ繝ｼ繝・ぅ繝ｳ繧ｰ</td>
                        <td className="py-2">UTF-8</td>
                      </tr>
                    </tbody>
                  </table>

                  <h2 className="text-2xl font-bold mt-8 mb-4">繧ｯ繧､繝・け繧ｹ繧ｿ繝ｼ繝・/h2>
                  <div className="bg-gray-900 rounded-lg p-4 text-white">
                    <div className="text-sm text-gray-400 mb-2"># 莨∵･ｭ荳隕ｧ繧貞叙蠕・/div>
                    <code className="text-green-400">
                      curl -H "X-API-Key: YOUR_API_KEY" \<br />
                      &nbsp;&nbsp;https://api.xbrl.jp/v1/companies
                    </code>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">荳ｻ縺ｪ讖溯・</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>4,231遉ｾ縺ｮ譌･譛ｬ莨∵･ｭ繝・・繧ｿ縺ｸ縺ｮ繧｢繧ｯ繧ｻ繧ｹ</li>
                    <li>20蟷ｴ蛻・・雋｡蜍吶ョ繝ｼ繧ｿ螻･豁ｴ</li>
                    <li>譛我ｾ｡險ｼ蛻ｸ蝣ｱ蜻頑嶌縺ｮ蜈ｨ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ</li>
                    <li>繝ｪ繧｢繝ｫ繧ｿ繧､繝繝・・繧ｿ譖ｴ譁ｰ</li>
                    <li>鬮伜ｺｦ縺ｪ讀懃ｴ｢繝ｻ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ讖溯・</li>
                    <li>Webhook蟇ｾ蠢懶ｼ・ro繝励Λ繝ｳ・・/li>
                  </ul>
                </div>
              )}

              {activeSection === 'authentication' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">隱崎ｨｼ</h1>
                  
                  <p className="mb-6">
                    XBRL雋｡蜍吶ョ繝ｼ繧ｿAPI縺ｯ縲、PI繧ｭ繝ｼ繝吶・繧ｹ縺ｮ隱崎ｨｼ繧剃ｽｿ逕ｨ縺励∪縺吶ゅ☆縺ｹ縺ｦ縺ｮAPI繝ｪ繧ｯ繧ｨ繧ｹ繝医↓縺ｯ縲∵怏蜉ｹ縺ｪAPI繧ｭ繝ｼ繧偵・繝・ム繝ｼ縺ｫ蜷ｫ繧√ｋ蠢・ｦ√′縺ゅｊ縺ｾ縺吶・                  </p>

                  <h2 className="text-2xl font-bold mt-8 mb-4">API繧ｭ繝ｼ縺ｮ蜿門ｾ・/h2>
                  <ol className="list-decimal pl-6 space-y-2 mb-6">
                    <li>繧｢繧ｫ繧ｦ繝ｳ繝医ｒ菴懈・縺ｾ縺溘・繝ｭ繧ｰ繧､繝ｳ</li>
                    <li>繝繝・す繝･繝懊・繝峨°繧峨窟PI繧ｭ繝ｼ縲阪そ繧ｯ繧ｷ繝ｧ繝ｳ縺ｸ遘ｻ蜍・/li>
                    <li>縲梧眠縺励＞API繧ｭ繝ｼ繧堤函謌舌阪ｒ繧ｯ繝ｪ繝・け</li>
                    <li>逕滓・縺輔ｌ縺溘く繝ｼ繧貞ｮ牙・縺ｪ蝣ｴ謇縺ｫ菫晏ｭ・/li>
                  </ol>

                  <h2 className="text-2xl font-bold mt-8 mb-4">隱崎ｨｼ譁ｹ豕・/h2>
                  <p className="mb-4">API繧ｭ繝ｼ縺ｯ <code className="bg-gray-100 px-2 py-1 rounded">X-API-Key</code> 繝倥ャ繝繝ｼ縺ｫ蜷ｫ繧√※縺上□縺輔＞・・/p>
                  
                  <div className="bg-gray-900 rounded-lg p-4 text-white mb-6">
                    <code className="text-green-400">
                      curl -H "X-API-Key: sk_test_abc123xyz789" \<br />
                      &nbsp;&nbsp;https://api.xbrl.jp/v1/companies
                    </code>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">繧ｻ繧ｭ繝･繝ｪ繝・ぅ縺ｮ繝吶せ繝医・繝ｩ繧ｯ繝・ぅ繧ｹ</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>API繧ｭ繝ｼ繧貞・髢九Μ繝昴ず繝医Μ縺ｫ繧ｳ繝溘ャ繝医＠縺ｪ縺・/li>
                    <li>繧ｯ繝ｩ繧､繧｢繝ｳ繝医し繧､繝峨・繧ｳ繝ｼ繝峨↓API繧ｭ繝ｼ繧貞性繧√↑縺・/li>
                    <li>迺ｰ蠅・､画焚繧剃ｽｿ逕ｨ縺励※API繧ｭ繝ｼ繧堤ｮ｡逅・/li>
                    <li>螳壽悄逧・↓API繧ｭ繝ｼ繧偵Ο繝ｼ繝・・繧ｷ繝ｧ繝ｳ</li>
                    <li>荳崎ｦ√↓縺ｪ縺｣縺蘗PI繧ｭ繝ｼ縺ｯ蜑企勁</li>
                  </ul>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
                    <p className="text-yellow-700">
                      <strong>笞・・驥崎ｦ・</strong> API繧ｭ繝ｼ縺梧ｼ乗ｴｩ縺励◆蝣ｴ蜷医・縲∫峩縺｡縺ｫ繝繝・す繝･繝懊・繝峨°繧臥┌蜉ｹ蛹悶＠縲∵眠縺励＞繧ｭ繝ｼ繧堤函謌舌＠縺ｦ縺上□縺輔＞縲・                    </p>
                  </div>
                </div>
              )}

              {activeSection === 'endpoints' && (
                <div className="space-y-8">
                  <h1 className="text-3xl font-bold mb-6">API繧ｨ繝ｳ繝峨・繧､繝ｳ繝・/h1>
                  
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
                        {key === 'companies' && '莨∵･ｭ荳隕ｧ'}
                        {key === 'companyDetail' && '莨∵･ｭ隧ｳ邏ｰ'}
                        {key === 'financial' && '雋｡蜍吶ョ繝ｼ繧ｿ'}
                        {key === 'documents' && '繝峨く繝･繝｡繝ｳ繝・}
                        {key === 'search' && '讀懃ｴ｢'}
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
                      <h3 className="font-bold mb-4">繝代Λ繝｡繝ｼ繧ｿ</h3>
                      <table className="w-full mb-6">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">蜷榊燕</th>
                            <th className="text-left py-2">蝙・/th>
                            <th className="text-left py-2">蠢・・/th>
                            <th className="text-left py-2">隱ｬ譏・/th>
                          </tr>
                        </thead>
                        <tbody>
                          {endpoints[selectedEndpoint].parameters.map((param, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-2"><code className="bg-gray-100 px-2 py-1 rounded text-sm">{param.name}</code></td>
                              <td className="py-2 text-sm">{param.type}</td>
                              <td className="py-2">
                                {param.required ? (
                                  <span className="text-red-600 font-medium">蠢・・/span>
                                ) : (
                                  <span className="text-gray-500">莉ｻ諢・/span>
                                )}
                              </td>
                              <td className="py-2 text-sm">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <h3 className="font-bold mb-4">繝ｬ繧ｹ繝昴Φ繧ｹ萓・/h3>
                      <div className="bg-gray-900 rounded-lg p-4 text-white overflow-x-auto">
                        <pre className="text-sm">
                          <code className="text-green-400">{endpoints[selectedEndpoint].response}</code>
                        </pre>
                      </div>

                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-bold mb-3">噫 Try it out!</h4>
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="API繧ｭ繝ｼ繧貞・蜉・
                            value={tryItApiKey}
                            onChange={(e) => setTryItApiKey(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg"
                          />
                          <button
                            onClick={handleTryIt}
                            disabled={isLoading}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isLoading ? '繝ｪ繧ｯ繧ｨ繧ｹ繝井ｸｭ...' : 'API繧貞ｮ溯｡・}
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
                  <h1 className="text-3xl font-bold mb-6">繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ</h1>
                  
                  <p className="mb-6">
                    API縺ｯ讓呎ｺ也噪縺ｪHTTP繧ｹ繝・・繧ｿ繧ｹ繧ｳ繝ｼ繝峨ｒ菴ｿ逕ｨ縺励※繝ｪ繧ｯ繧ｨ繧ｹ繝医・謌仙粥縺ｾ縺溘・螟ｱ謨励ｒ遉ｺ縺励∪縺吶・                  </p>

                  <h2 className="text-2xl font-bold mt-8 mb-4">HTTP繧ｹ繝・・繧ｿ繧ｹ繧ｳ繝ｼ繝・/h2>
                  <table className="w-full border-collapse mb-6">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-4">繧ｳ繝ｼ繝・/th>
                        <th className="text-left py-2 px-4">諢丞袖</th>
                        <th className="text-left py-2 px-4">隱ｬ譏・/th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-green-100 text-green-700 px-2 py-1 rounded">200</code></td>
                        <td className="py-2 px-4">OK</td>
                        <td className="py-2 px-4">繝ｪ繧ｯ繧ｨ繧ｹ繝医′謌仙粥縺励∪縺励◆</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">400</code></td>
                        <td className="py-2 px-4">Bad Request</td>
                        <td className="py-2 px-4">繝ｪ繧ｯ繧ｨ繧ｹ繝医′荳肴ｭ｣縺ｧ縺呻ｼ医ヱ繝ｩ繝｡繝ｼ繧ｿ繧ｨ繝ｩ繝ｼ縺ｪ縺ｩ・・/td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">401</code></td>
                        <td className="py-2 px-4">Unauthorized</td>
                        <td className="py-2 px-4">API繧ｭ繝ｼ縺檎┌蜉ｹ縺ｾ縺溘・譛ｪ謠蝉ｾ帙〒縺・/td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">403</code></td>
                        <td className="py-2 px-4">Forbidden</td>
                        <td className="py-2 px-4">繧｢繧ｯ繧ｻ繧ｹ讓ｩ髯舌′縺ゅｊ縺ｾ縺帙ｓ</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">404</code></td>
                        <td className="py-2 px-4">Not Found</td>
                        <td className="py-2 px-4">繝ｪ繧ｽ繝ｼ繧ｹ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-red-100 text-red-700 px-2 py-1 rounded">429</code></td>
                        <td className="py-2 px-4">Too Many Requests</td>
                        <td className="py-2 px-4">繝ｬ繝ｼ繝亥宛髯舌↓驕斐＠縺ｾ縺励◆</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4"><code className="bg-red-100 text-red-700 px-2 py-1 rounded">500</code></td>
                        <td className="py-2 px-4">Internal Server Error</td>
                        <td className="py-2 px-4">繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆</td>
                      </tr>
                    </tbody>
                  </table>

                  <h2 className="text-2xl font-bold mt-8 mb-4">繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ蠖｢蠑・/h2>
                  <div className="bg-gray-900 rounded-lg p-4 text-white mb-6">
                    <pre className="text-sm">
                      <code className="text-red-400">{`{
  "error": {
    "code": "invalid_api_key",
    "message": "謠蝉ｾ帙＆繧後◆API繧ｭ繝ｼ縺檎┌蜉ｹ縺ｧ縺・,
    "details": {
      "provided_key": "sk_test_***",
      "timestamp": "2024-01-14T12:34:56Z"
    }
  }
}`}</code>
                    </pre>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">繧ｨ繝ｩ繝ｼ繧ｳ繝ｼ繝我ｸ隕ｧ</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><code className="bg-gray-100 px-2 py-1 rounded">invalid_api_key</code> - API繧ｭ繝ｼ縺檎┌蜉ｹ</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">missing_parameter</code> - 蠢・医ヱ繝ｩ繝｡繝ｼ繧ｿ縺御ｸ崎ｶｳ</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">invalid_parameter</code> - 繝代Λ繝｡繝ｼ繧ｿ縺ｮ蛟､縺御ｸ肴ｭ｣</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">rate_limit_exceeded</code> - 繝ｬ繝ｼ繝亥宛髯占ｶ・℃</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">resource_not_found</code> - 繝ｪ繧ｽ繝ｼ繧ｹ縺悟ｭ伜惠縺励↑縺・/li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">internal_error</code> - 繧ｵ繝ｼ繝舌・蜀・Κ繧ｨ繝ｩ繝ｼ</li>
                  </ul>
                </div>
              )}

              {activeSection === 'ratelimits' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">繝ｬ繝ｼ繝亥宛髯・/h1>
                  
                  <p className="mb-6">
                    API縺ｮ螳牙ｮ壽ｧ縺ｨ繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ繧堤ｶｭ謖√☆繧九◆繧√√・繝ｩ繝ｳ縺ｫ蠢懊§縺溘Ξ繝ｼ繝亥宛髯舌ｒ險ｭ縺代※縺・∪縺吶・                  </p>

                  <h2 className="text-2xl font-bold mt-8 mb-4">繝励Λ繝ｳ蛻･蛻ｶ髯・/h2>
                  <table className="w-full border-collapse mb-6">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-4">繝励Λ繝ｳ</th>
                        <th className="text-left py-2 px-4">譛磯俣繝ｪ繧ｯ繧ｨ繧ｹ繝・/th>
                        <th className="text-left py-2 px-4">蜷梧凾謗･邯壽焚</th>
                        <th className="text-left py-2 px-4">繝舌・繧ｹ繝医Ξ繝ｼ繝・/th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Free</td>
                        <td className="py-2 px-4">100蝗・譛・/td>
                        <td className="py-2 px-4">1</td>
                        <td className="py-2 px-4">1蝗・遘・/td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Standard</td>
                        <td className="py-2 px-4">3,000蝗・譛・/td>
                        <td className="py-2 px-4">5</td>
                        <td className="py-2 px-4">10蝗・遘・/td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Pro</td>
                        <td className="py-2 px-4">辟｡蛻ｶ髯・/td>
                        <td className="py-2 px-4">20</td>
                        <td className="py-2 px-4">100蝗・遘・/td>
                      </tr>
                    </tbody>
                  </table>

                  <h2 className="text-2xl font-bold mt-8 mb-4">繝ｬ繝ｼ繝亥宛髯舌・繝・ム繝ｼ</h2>
                  <p className="mb-4">縺吶∋縺ｦ縺ｮAPI繝ｬ繧ｹ繝昴Φ繧ｹ縺ｫ縺ｯ縲∫樟蝨ｨ縺ｮ繝ｬ繝ｼ繝亥宛髯千憾諷九ｒ遉ｺ縺吶・繝・ム繝ｼ縺悟性縺ｾ繧後∪縺呻ｼ・/p>
                  
                  <div className="bg-gray-100 rounded-lg p-4 mb-6">
                    <code className="text-sm">
                      X-RateLimit-Limit: 3000<br />
                      X-RateLimit-Remaining: 2456<br />
                      X-RateLimit-Reset: 1704326400
                    </code>
                  </div>

                  <ul className="list-disc pl-6 space-y-2 mb-6">
                    <li><code className="bg-gray-100 px-2 py-1 rounded">X-RateLimit-Limit</code> - 迴ｾ蝨ｨ縺ｮ譛滄俣縺ｮ譛螟ｧ繝ｪ繧ｯ繧ｨ繧ｹ繝域焚</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">X-RateLimit-Remaining</code> - 谿九ｊ縺ｮ繝ｪ繧ｯ繧ｨ繧ｹ繝域焚</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">X-RateLimit-Reset</code> - 繝ｪ繧ｻ繝・ヨ譎ょ綾・・NIX繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝暦ｼ・/li>
                  </ul>

                  <h2 className="text-2xl font-bold mt-8 mb-4">繝ｬ繝ｼ繝亥宛髯占ｶ・℃譎ゅ・蟇ｾ蠢・/h2>
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <p className="text-red-700">
                      繝ｬ繝ｼ繝亥宛髯舌↓驕斐＠縺溷ｴ蜷医、PI縺ｯ <code className="bg-red-100 px-2 py-1 rounded">429 Too Many Requests</code> 繧定ｿ斐＠縺ｾ縺吶・                      <code className="bg-red-100 px-2 py-1 rounded">Retry-After</code> 繝倥ャ繝繝ｼ繧堤｢ｺ隱阪＠縺ｦ縲∵ｬ｡縺ｮ繝ｪ繧ｯ繧ｨ繧ｹ繝医∪縺ｧ縺ｮ蠕・ｩ滓凾髢薙ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・                    </p>
                  </div>
                </div>
              )}

              {activeSection === 'webhooks' && (
                <div className="prose max-w-none">
                  <h1 className="text-3xl font-bold mb-6">Webhook</h1>
                  
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                    <p className="text-blue-700">
                      <strong>邃ｹ・・豕ｨ諢・</strong> Webhook讖溯・縺ｯPro繝励Λ繝ｳ縺ｧ縺ｮ縺ｿ蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｧ縺吶・                    </p>
                  </div>

                  <p className="mb-6">
                    Webhook繧剃ｽｿ逕ｨ縺吶ｋ縺ｨ縲∫音螳壹・繧､繝吶Φ繝医′逋ｺ逕溘＠縺溘→縺阪↓縲∵欠螳壹＠縺欟RL縺ｫ閾ｪ蜍慕噪縺ｫ騾夂衍繧帝∽ｿ｡縺ｧ縺阪∪縺吶・                  </p>

                  <h2 className="text-2xl font-bold mt-8 mb-4">蟇ｾ蠢懊う繝吶Φ繝・/h2>
                  <ul className="list-disc pl-6 space-y-2 mb-6">
                    <li><code className="bg-gray-100 px-2 py-1 rounded">company.created</code> - 譁ｰ縺励＞莨∵･ｭ縺瑚ｿｽ蜉縺輔ｌ縺・/li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">document.updated</code> - 繝峨く繝･繝｡繝ｳ繝医′譖ｴ譁ｰ縺輔ｌ縺・/li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">financial.published</code> - 譁ｰ縺励＞雋｡蜍吶ョ繝ｼ繧ｿ縺悟・髢九＆繧後◆</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">rate_limit.warning</code> - 繝ｬ繝ｼ繝亥宛髯舌・80%縺ｫ蛻ｰ驕・/li>
                  </ul>

                  <h2 className="text-2xl font-bold mt-8 mb-4">Webhook繝壹う繝ｭ繝ｼ繝我ｾ・/h2>
                  <div className="bg-gray-900 rounded-lg p-4 text-white mb-6">
                    <pre className="text-sm">
                      <code className="text-green-400">{`{
  "event": "document.updated",
  "timestamp": "2024-01-14T12:34:56Z",
  "data": {
    "company_id": "S100LO6W",
    "company_name": "繝医Κ繧ｿ閾ｪ蜍戊ｻ頑ｪ蠑丈ｼ夂､ｾ",
    "document_type": "譛我ｾ｡險ｼ蛻ｸ蝣ｱ蜻頑嶌",
    "year": 2023,
    "section": "0101010",
    "changes": ["content", "last_updated"]
  }
}`}</code>
                    </pre>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">Webhook鄂ｲ蜷阪・讀懆ｨｼ</h2>
                  <p className="mb-4">繧ｻ繧ｭ繝･繝ｪ繝・ぅ縺ｮ縺溘ａ縲√☆縺ｹ縺ｦ縺ｮWebhook繝ｪ繧ｯ繧ｨ繧ｹ繝医↓縺ｯHMAC-SHA256鄂ｲ蜷阪′蜷ｫ縺ｾ繧後∪縺呻ｼ・/p>
                  
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
                  <h1 className="text-3xl font-bold mb-6">螟画峩螻･豁ｴ</h1>
                  
                  <div className="space-y-8">
                    <div className="border-l-4 border-blue-400 pl-4">
                      <h3 className="text-xl font-bold">v1.0.0 - 2025蟷ｴ1譛・4譌･</h3>
                      <p className="text-gray-600 mb-2">蛻晏屓繝ｪ繝ｪ繝ｼ繧ｹ</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>莨∵･ｭ荳隕ｧ繝ｻ隧ｳ邏ｰAPI縺ｮ螳溯｣・/li>
                        <li>雋｡蜍吶ョ繝ｼ繧ｿAPI縺ｮ螳溯｣・/li>
                        <li>繝峨く繝･繝｡繝ｳ繝亥叙蠕輸PI縺ｮ螳溯｣・/li>
                        <li>讀懃ｴ｢API縺ｮ螳溯｣・/li>
                        <li>Webhook讖溯・・・ro繝励Λ繝ｳ・・/li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-green-400 pl-4">
                      <h3 className="text-xl font-bold">v0.9.0 - 2023蟷ｴ12譛・譌･</h3>
                      <p className="text-gray-600 mb-2">繝吶・繧ｿ迚医Μ繝ｪ繝ｼ繧ｹ</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>髯仙ｮ壹Θ繝ｼ繧ｶ繝ｼ縺ｸ縺ｮ繝吶・繧ｿ繝・せ繝磯幕蟋・/li>
                        <li>蝓ｺ譛ｬ逧・↑API讖溯・縺ｮ螳溯｣・/li>
                        <li>繝ｬ繝ｼ繝亥宛髯舌・螳溯｣・/li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-gray-400 pl-4">
                      <h3 className="text-xl font-bold">莉雁ｾ後・莠亥ｮ・/h3>
                      <p className="text-gray-600 mb-2">髢狗匱荳ｭ縺ｮ讖溯・</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>GraphQL API蟇ｾ蠢・/li>
                        <li>繝舌ャ繝∝・逅・PI</li>
                        <li>繝ｪ繧｢繝ｫ繧ｿ繧､繝繧ｹ繝医Μ繝ｼ繝溘Φ繧ｰ</li>
                        <li>讖滓｢ｰ蟄ｦ鄙偵↓繧医ｋ莠域ｸｬ蛻・梵API</li>
                        <li>繧ｫ繧ｹ繧ｿ繝Webhook繝輔ぅ繝ｫ繧ｿ繝ｼ</li>
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
