'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SDKPage() {
  const router = useRouter();
  const [copiedCode, setCopiedCode] = useState('');

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const examples = {
    curl: {
      name: 'cURL',
      code: `# 企業一覧を取得
curl -H "X-API-Key: YOUR_API_KEY" \\
  https://api.xbrl.jp/v1/companies

# 特定企業のデータを取得
curl -H "X-API-Key: YOUR_API_KEY" \\
  https://api.xbrl.jp/v1/companies/7203`
    },
    javascript: {
      name: 'JavaScript/TypeScript',
      code: `// 企業一覧を取得
const response = await fetch('https://api.xbrl.jp/v1/companies', {
  headers: {
    'X-API-Key': 'YOUR_API_KEY'
  }
});
const companies = await response.json();

// 特定企業のデータを取得
const company = await fetch('https://api.xbrl.jp/v1/companies/7203', {
  headers: {
    'X-API-Key': 'YOUR_API_KEY'
  }
}).then(res => res.json());`
    },
    python: {
      name: 'Python',
      code: `import requests

# APIキーを設定
headers = {'X-API-Key': 'YOUR_API_KEY'}

# 企業一覧を取得
response = requests.get('https://api.xbrl.jp/v1/companies', headers=headers)
companies = response.json()

# 特定企業のデータを取得
response = requests.get('https://api.xbrl.jp/v1/companies/7203', headers=headers)
company = response.json()`
    },
    ruby: {
      name: 'Ruby',
      code: `require 'net/http'
require 'json'

# APIキーを設定
headers = { 'X-API-Key' => 'YOUR_API_KEY' }

# 企業一覧を取得
uri = URI('https://api.xbrl.jp/v1/companies')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true
request = Net::HTTP::Get.new(uri, headers)
response = http.request(request)
companies = JSON.parse(response.body)

# 特定企業のデータを取得
uri = URI('https://api.xbrl.jp/v1/companies/7203')
request = Net::HTTP::Get.new(uri, headers)
response = http.request(request)
company = JSON.parse(response.body)`
    },
    go: {
      name: 'Go',
      code: `package main

import (
    "fmt"
    "net/http"
    "io/ioutil"
    "encoding/json"
)

func main() {
    // APIキーを設定
    apiKey := "YOUR_API_KEY"
    
    // HTTPクライアントを作成
    client := &http.Client{}
    
    // 企業一覧を取得
    req, _ := http.NewRequest("GET", "https://api.xbrl.jp/v1/companies", nil)
    req.Header.Add("X-API-Key", apiKey)
    
    resp, _ := client.Do(req)
    defer resp.Body.Close()
    
    body, _ := ioutil.ReadAll(resp.Body)
    
    var companies interface{}
    json.Unmarshal(body, &companies)
    fmt.Println(companies)
}`
    },
    php: {
      name: 'PHP',
      code: `<?php
// APIキーを設定
$apiKey = 'YOUR_API_KEY';
$headers = ['X-API-Key: ' . $apiKey];

// 企業一覧を取得
$ch = curl_init('https://api.xbrl.jp/v1/companies');
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
$companies = json_decode($response, true);

// 特定企業のデータを取得
$ch = curl_init('https://api.xbrl.jp/v1/companies/7203');
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
$company = json_decode($response, true);`
    }
  };

  type ExampleKey = keyof typeof examples;
  const [selectedLanguage, setSelectedLanguage] = useState<ExampleKey>('curl');

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
              <h1 className="text-xl font-bold">API統合ガイド</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/docs')}
                className="text-gray-600 hover:text-gray-900 px-4 py-2"
              >
                APIドキュメント
              </button>
              <button
                onClick={() => router.push('/examples')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                サンプルコード
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* メインコンテンツ */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h1 className="text-3xl font-bold mb-4">REST APIによる統合</h1>
          <p className="text-gray-600 mb-8">
            XBRL財務データAPIはシンプルなREST APIとして設計されています。<br />
            HTTPクライアントを使用して、どの言語からでも簡単にアクセスできます。
          </p>

          {/* API基本情報 */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">API基本情報</h2>
            <dl className="space-y-2">
              <div className="flex">
                <dt className="font-medium text-gray-600 w-32">ベースURL:</dt>
                <dd className="font-mono text-sm">https://api.xbrl.jp/v1</dd>
              </div>
              <div className="flex">
                <dt className="font-medium text-gray-600 w-32">認証:</dt>
                <dd className="font-mono text-sm">X-API-Key ヘッダー</dd>
              </div>
              <div className="flex">
                <dt className="font-medium text-gray-600 w-32">レスポンス形式:</dt>
                <dd className="font-mono text-sm">JSON</dd>
              </div>
              <div className="flex">
                <dt className="font-medium text-gray-600 w-32">文字コード:</dt>
                <dd className="font-mono text-sm">UTF-8</dd>
              </div>
            </dl>
          </div>

          {/* 言語別サンプル */}
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">言語別サンプルコード</h2>
            
            {/* タブ */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-4 overflow-x-auto">
                {Object.keys(examples).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang as ExampleKey)}
                    className={`py-2 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                      selectedLanguage === lang
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {examples[lang as ExampleKey].name}
                  </button>
                ))}
              </nav>
            </div>

            {/* コード表示 */}
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <pre className="text-green-400 text-sm overflow-x-auto">
                <code>{examples[selectedLanguage].code}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(examples[selectedLanguage].code)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white text-sm"
              >
                {copiedCode === examples[selectedLanguage].code ? '✓ コピー済み' : 'コピー'}
              </button>
            </div>
          </div>

          {/* エラーハンドリング */}
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">エラーハンドリング</h2>
            <p className="text-gray-600 mb-4">
              APIはHTTPステータスコードとJSONレスポンスでエラーを返します。
            </p>
            <div className="bg-gray-900 rounded-lg p-4">
              <pre className="text-green-400 text-sm">
{`// エラーレスポンスの例
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API呼び出し制限を超えました",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "reset": "2025-08-15T00:00:00Z"
    }
  }
}`}
              </pre>
            </div>
          </div>

          {/* HTTPステータスコード */}
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">HTTPステータスコード</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">コード</th>
                  <th className="text-left py-2">説明</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b">
                  <td className="py-2 font-mono">200 OK</td>
                  <td className="py-2 text-gray-600">リクエスト成功</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-mono">400 Bad Request</td>
                  <td className="py-2 text-gray-600">不正なリクエストパラメータ</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-mono">401 Unauthorized</td>
                  <td className="py-2 text-gray-600">認証エラー（APIキーが無効）</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-mono">404 Not Found</td>
                  <td className="py-2 text-gray-600">リソースが見つからない</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-mono">429 Too Many Requests</td>
                  <td className="py-2 text-gray-600">レート制限超過</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-mono">500 Internal Server Error</td>
                  <td className="py-2 text-gray-600">サーバーエラー</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ベストプラクティス */}
          <div>
            <h2 className="text-lg font-bold mb-4">ベストプラクティス</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium">リトライ処理の実装</span>
                  <p className="text-gray-600 text-sm">一時的なエラーに対して、指数バックオフでリトライを実装してください。</p>
                </div>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium">レート制限の遵守</span>
                  <p className="text-gray-600 text-sm">レスポンスヘッダーのX-RateLimit-*を確認し、制限を超えないようにしてください。</p>
                </div>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium">キャッシュの活用</span>
                  <p className="text-gray-600 text-sm">変更頻度の低いデータは適切にキャッシュして、API呼び出しを削減してください。</p>
                </div>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium">APIキーの安全な管理</span>
                  <p className="text-gray-600 text-sm">APIキーは環境変数やシークレット管理サービスで安全に管理してください。</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* 関連リソース */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">関連リソース</h2>
          <p className="text-blue-100 mb-6">
            API統合に役立つドキュメントとサンプルコードをご用意しています。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/docs')}
              className="bg-white/20 backdrop-blur p-4 rounded-lg hover:bg-white/30 transition-colors text-left"
            >
              <div className="text-xl mb-2">📚</div>
              <div className="font-medium">APIドキュメント</div>
              <div className="text-sm text-blue-100">全エンドポイントの詳細仕様</div>
            </button>
            <button
              onClick={() => router.push('/examples')}
              className="bg-white/20 backdrop-blur p-4 rounded-lg hover:bg-white/30 transition-colors text-left"
            >
              <div className="text-xl mb-2">💻</div>
              <div className="font-medium">サンプルコード</div>
              <div className="text-sm text-blue-100">実装例とユースケース</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}