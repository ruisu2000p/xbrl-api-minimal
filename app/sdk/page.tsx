'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SDKPage() {
  const router = useRouter();
  const [copiedCode, setCopiedCode] = useState('');

  const copyToClipboard = (code: string, language: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(language);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const sdks = {
    javascript: {
      name: 'JavaScript/TypeScript',
      version: '1.2.0',
      install: 'npm install @xbrl-jp/sdk',
      example: `import { XBRLClient } from '@xbrl-jp/sdk';

// クライアントの初期化
const client = new XBRLClient({
  apiKey: 'YOUR_API_KEY'
});

// 企業一覧を取得
const companies = await client.companies.list({
  limit: 100,
  sector: '輸送用機器'
});

// 特定企業の財務データを取得
const financial = await client.financial.get({
  companyId: 'S100LO6W',
  year: 2023
});

// 有価証券報告書のセクションを取得
const document = await client.documents.get({
  companyId: 'S100LO6W',
  year: 2023,
  section: '0101010'
});`,
      features: [
        'TypeScript完全対応',
        '自動リトライ機能',
        'プロミスベースAPI',
        'ストリーミングサポート',
        'Webhook署名検証',
        'エラーハンドリング'
      ]
    },
    python: {
      name: 'Python',
      version: '1.1.0',
      install: 'pip install xbrl-jp',
      example: `from xbrl_jp import XBRLClient

# クライアントの初期化
client = XBRLClient(api_key='YOUR_API_KEY')

# 企業一覧を取得
companies = client.companies.list(
    limit=100,
    sector='輸送用機器'
)

# 特定企業の財務データを取得
financial = client.financial.get(
    company_id='S100LO6W',
    year=2023
)

# 有価証券報告書のセクションを取得
document = client.documents.get(
    company_id='S100LO6W',
    year=2023,
    section='0101010'
)

# データフレームに変換（pandas連携）
import pandas as pd
df = pd.DataFrame(companies['data'])`,
      features: [
        'Type hints対応',
        'pandas連携',
        '非同期サポート（asyncio）',
        'データ検証',
        'カスタムエラークラス',
        'ロギング機能'
      ]
    },
    ruby: {
      name: 'Ruby',
      version: '1.0.0',
      install: 'gem install xbrl-jp',
      example: `require 'xbrl_jp'

# クライアントの初期化
client = XBRLJP::Client.new(api_key: 'YOUR_API_KEY')

# 企業一覧を取得
companies = client.companies.list(
  limit: 100,
  sector: '輸送用機器'
)

# 特定企業の財務データを取得
financial = client.financial.get(
  company_id: 'S100LO6W',
  year: 2023
)

# 有価証券報告書のセクションを取得
document = client.documents.get(
  company_id: 'S100LO6W',
  year: 2023,
  section: '0101010'
)

# イテレータパターン
client.companies.each_page do |page|
  page.each do |company|
    puts company['name']
  end
end`,
      features: [
        'Rubyらしいインターフェース',
        'ブロック構文サポート',
        'ページネーション自動処理',
        'エラーハンドリング',
        'Rails統合',
        'テストヘルパー'
      ]
    },
    go: {
      name: 'Go',
      version: '1.0.0',
      install: 'go get github.com/xbrl-jp/xbrl-go',
      example: `package main

import (
    "fmt"
    "github.com/xbrl-jp/xbrl-go"
)

func main() {
    // クライアントの初期化
    client := xbrl.NewClient("YOUR_API_KEY")
    
    // 企業一覧を取得
    companies, err := client.Companies.List(&xbrl.CompanyListOptions{
        Limit: 100,
        Sector: "輸送用機器",
    })
    if err != nil {
        panic(err)
    }
    
    // 特定企業の財務データを取得
    financial, err := client.Financial.Get(&xbrl.FinancialOptions{
        CompanyID: "S100LO6W",
        Year: 2023,
    })
    
    // 有価証券報告書のセクションを取得
    document, err := client.Documents.Get(&xbrl.DocumentOptions{
        CompanyID: "S100LO6W",
        Year: 2023,
        Section: "0101010",
    })
}`,
      features: [
        '完全な型安全性',
        'コンテキスト対応',
        '並行処理サポート',
        'エラーハンドリング',
        'カスタムHTTPクライアント',
        'モックテスト対応'
      ]
    },
    php: {
      name: 'PHP',
      version: '1.0.0',
      install: 'composer require xbrl-jp/sdk',
      example: `<?php
require_once 'vendor/autoload.php';

use XBRLJP\\Client;

// クライアントの初期化
$client = new Client('YOUR_API_KEY');

// 企業一覧を取得
$companies = $client->companies()->list([
    'limit' => 100,
    'sector' => '輸送用機器'
]);

// 特定企業の財務データを取得
$financial = $client->financial()->get([
    'company_id' => 'S100LO6W',
    'year' => 2023
]);

// 有価証券報告書のセクションを取得
$document = $client->documents()->get([
    'company_id' => 'S100LO6W',
    'year' => 2023,
    'section' => '0101010'
]);

// Laravel統合
$companies = XBRLJP::companies()->paginate(20);`,
      features: [
        'PSR準拠',
        'Laravel/Symfony統合',
        'キャッシュサポート',
        'ページネーション',
        'エラーハンドリング',
        'PHPUnit対応'
      ]
    },
    java: {
      name: 'Java',
      version: '1.0.0',
      install: `<dependency>
  <groupId>jp.xbrl</groupId>
  <artifactId>xbrl-sdk</artifactId>
  <version>1.0.0</version>
</dependency>`,
      example: `import jp.xbrl.XBRLClient;
import jp.xbrl.models.*;

public class Example {
    public static void main(String[] args) {
        // クライアントの初期化
        XBRLClient client = new XBRLClient("YOUR_API_KEY");
        
        // 企業一覧を取得
        CompanyListRequest request = CompanyListRequest.builder()
            .limit(100)
            .sector("輸送用機器")
            .build();
        CompanyListResponse companies = client.companies().list(request);
        
        // 特定企業の財務データを取得
        FinancialData financial = client.financial()
            .get("S100LO6W", 2023);
        
        // 有価証券報告書のセクションを取得
        Document document = client.documents()
            .get("S100LO6W", 2023, "0101010");
        
        // Spring Boot統合
        @Autowired
        private XBRLClient xbrlClient;
    }
}`,
      features: [
        'ビルダーパターン',
        'Spring Boot統合',
        '非同期サポート（CompletableFuture）',
        'Jackson連携',
        'カスタム例外',
        'JUnit対応'
      ]
    }
  } as const;

  // 型定義
  type SDKKey = keyof typeof sdks;
  const [selectedLanguage, setSelectedLanguage] = useState<SDKKey>('javascript');

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
              <h1 className="text-xl font-bold">SDK & ライブラリ</h1>
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
                サンプルコード →
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヒーローセクション */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white mb-8">
          <h1 className="text-3xl font-bold mb-4">公式SDK & ライブラリ</h1>
          <p className="text-blue-100 mb-6">
            お好みの言語でXBRL財務データAPIを簡単に統合。<br />
            すべてのSDKは、型安全性、エラーハンドリング、自動リトライ機能を標準装備。
          </p>
          <div className="flex gap-4">
            <a 
              href="https://github.com/xbrl-jp"
              className="bg-white text-blue-600 px-6 py-2 rounded-lg hover:bg-gray-100 inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
            <button className="bg-white/20 text-white px-6 py-2 rounded-lg hover:bg-white/30">
              貢献ガイド
            </button>
          </div>
        </div>

        {/* 言語選択タブ */}
        <div className="bg-white rounded-t-xl border-b">
          <div className="flex gap-2 px-6 py-4 overflow-x-auto">
            {Object.keys(sdks).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang as SDKKey)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedLanguage === lang
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {sdks[lang as SDKKey].name}
              </button>
            ))}
          </div>
        </div>

        {/* SDKコンテンツ */}
        <div className="bg-white rounded-b-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">{sdks[selectedLanguage].name} SDK</h2>
              <p className="text-gray-600">バージョン {sdks[selectedLanguage].version}</p>
            </div>
            <div className="flex gap-2">
              <a 
                href={`https://github.com/xbrl-jp/${selectedLanguage}-sdk`}
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHubリポジトリ
              </a>
              <a 
                href="#"
                className="text-blue-600 hover:underline"
              >
                詳細ドキュメント
              </a>
            </div>
          </div>

          {/* インストール */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">インストール</h3>
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <code className="text-green-400 text-sm">{sdks[selectedLanguage].install}</code>
              <button
                onClick={() => copyToClipboard(sdks[selectedLanguage].install, 'install')}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                {copiedCode === 'install' ? '✓ コピー済み' : 'コピー'}
              </button>
            </div>
          </div>

          {/* 使用例 */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">使用例</h3>
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <pre className="text-green-400 text-sm overflow-x-auto">
                <code>{sdks[selectedLanguage].example}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(sdks[selectedLanguage].example, 'example')}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                {copiedCode === 'example' ? '✓ コピー済み' : 'コピー'}
              </button>
            </div>
          </div>

          {/* 主な機能 */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">主な機能</h3>
            <div className="grid grid-cols-2 gap-3">
              {sdks[selectedLanguage].features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* その他のリソース */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-bold mb-4">その他のリソース</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="#" className="border rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="text-2xl mb-2">📚</div>
                <div className="font-medium">完全ガイド</div>
                <div className="text-sm text-gray-600">SDKの詳細な使い方</div>
              </a>
              <a href="#" className="border rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="text-2xl mb-2">🔧</div>
                <div className="font-medium">API リファレンス</div>
                <div className="text-sm text-gray-600">全メソッドの詳細</div>
              </a>
              <a href="#" className="border rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="text-2xl mb-2">💬</div>
                <div className="font-medium">コミュニティ</div>
                <div className="text-sm text-gray-600">質問やディスカッション</div>
              </a>
            </div>
          </div>
        </div>

        {/* コミュニティSDK */}
        <div className="bg-white rounded-xl p-8 mt-8">
          <h2 className="text-2xl font-bold mb-6">コミュニティSDK</h2>
          <p className="text-gray-600 mb-6">
            コミュニティによって開発・メンテナンスされているSDKです。公式サポートはありませんが、多くの開発者に利用されています。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Rust SDK</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Community</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">高パフォーマンスなRust実装</p>
              <a href="#" className="text-blue-600 hover:underline text-sm">github.com/user/xbrl-rust →</a>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Swift SDK</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Community</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">iOS/macOS向けSwift実装</p>
              <a href="#" className="text-blue-600 hover:underline text-sm">github.com/user/xbrl-swift →</a>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">C# SDK</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Community</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">.NET/C#向け実装</p>
              <a href="#" className="text-blue-600 hover:underline text-sm">github.com/user/xbrl-dotnet →</a>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Kotlin SDK</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Community</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Android/Kotlin向け実装</p>
              <a href="#" className="text-blue-600 hover:underline text-sm">github.com/user/xbrl-kotlin →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}