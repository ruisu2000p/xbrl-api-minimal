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

// 繧ｯ繝ｩ繧､繧｢繝ｳ繝医・蛻晄悄蛹・const client = new XBRLClient({
  apiKey: 'YOUR_API_KEY'
});

// 莨∵･ｭ荳隕ｧ繧貞叙蠕・const companies = await client.companies.list({
  limit: 100,
  sector: '霈ｸ騾∫畑讖溷勣'
});

// 迚ｹ螳壻ｼ∵･ｭ縺ｮ雋｡蜍吶ョ繝ｼ繧ｿ繧貞叙蠕・const financial = await client.financial.get({
  companyId: 'S100LO6W',
  year: 2023
});

// 譛我ｾ｡險ｼ蛻ｸ蝣ｱ蜻頑嶌縺ｮ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ繧貞叙蠕・const document = await client.documents.get({
  companyId: 'S100LO6W',
  year: 2023,
  section: '0101010'
});`,
      features: [
        'TypeScript螳悟・蟇ｾ蠢・,
        '閾ｪ蜍輔Μ繝医Λ繧､讖溯・',
        '繝励Ο繝溘せ繝吶・繧ｹAPI',
        '繧ｹ繝医Μ繝ｼ繝溘Φ繧ｰ繧ｵ繝昴・繝・,
        'Webhook鄂ｲ蜷肴､懆ｨｼ',
        '繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ'
      ]
    },
    python: {
      name: 'Python',
      version: '1.1.0',
      install: 'pip install xbrl-jp',
      example: `from xbrl_jp import XBRLClient

# 繧ｯ繝ｩ繧､繧｢繝ｳ繝医・蛻晄悄蛹・client = XBRLClient(api_key='YOUR_API_KEY')

# 莨∵･ｭ荳隕ｧ繧貞叙蠕・companies = client.companies.list(
    limit=100,
    sector='霈ｸ騾∫畑讖溷勣'
)

# 迚ｹ螳壻ｼ∵･ｭ縺ｮ雋｡蜍吶ョ繝ｼ繧ｿ繧貞叙蠕・financial = client.financial.get(
    company_id='S100LO6W',
    year=2023
)

# 譛我ｾ｡險ｼ蛻ｸ蝣ｱ蜻頑嶌縺ｮ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ繧貞叙蠕・document = client.documents.get(
    company_id='S100LO6W',
    year=2023,
    section='0101010'
)

# 繝・・繧ｿ繝輔Ξ繝ｼ繝縺ｫ螟画鋤・・andas騾｣謳ｺ・・import pandas as pd
df = pd.DataFrame(companies['data'])`,
      features: [
        'Type hints蟇ｾ蠢・,
        'pandas騾｣謳ｺ',
        '髱槫酔譛溘し繝昴・繝茨ｼ・syncio・・,
        '繝・・繧ｿ讀懆ｨｼ',
        '繧ｫ繧ｹ繧ｿ繝繧ｨ繝ｩ繝ｼ繧ｯ繝ｩ繧ｹ',
        '繝ｭ繧ｮ繝ｳ繧ｰ讖溯・'
      ]
    },
    ruby: {
      name: 'Ruby',
      version: '1.0.0',
      install: 'gem install xbrl-jp',
      example: `require 'xbrl_jp'

# 繧ｯ繝ｩ繧､繧｢繝ｳ繝医・蛻晄悄蛹・client = XBRLJP::Client.new(api_key: 'YOUR_API_KEY')

# 莨∵･ｭ荳隕ｧ繧貞叙蠕・companies = client.companies.list(
  limit: 100,
  sector: '霈ｸ騾∫畑讖溷勣'
)

# 迚ｹ螳壻ｼ∵･ｭ縺ｮ雋｡蜍吶ョ繝ｼ繧ｿ繧貞叙蠕・financial = client.financial.get(
  company_id: 'S100LO6W',
  year: 2023
)

# 譛我ｾ｡險ｼ蛻ｸ蝣ｱ蜻頑嶌縺ｮ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ繧貞叙蠕・document = client.documents.get(
  company_id: 'S100LO6W',
  year: 2023,
  section: '0101010'
)

# 繧､繝・Ξ繝ｼ繧ｿ繝代ち繝ｼ繝ｳ
client.companies.each_page do |page|
  page.each do |company|
    puts company['name']
  end
end`,
      features: [
        'Ruby繧峨＠縺・う繝ｳ繧ｿ繝ｼ繝輔ぉ繝ｼ繧ｹ',
        '繝悶Ο繝・け讒区枚繧ｵ繝昴・繝・,
        '繝壹・繧ｸ繝阪・繧ｷ繝ｧ繝ｳ閾ｪ蜍募・逅・,
        '繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ',
        'Rails邨ｱ蜷・,
        '繝・せ繝医・繝ｫ繝代・'
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
    // 繧ｯ繝ｩ繧､繧｢繝ｳ繝医・蛻晄悄蛹・    client := xbrl.NewClient("YOUR_API_KEY")
    
    // 莨∵･ｭ荳隕ｧ繧貞叙蠕・    companies, err := client.Companies.List(&xbrl.CompanyListOptions{
        Limit: 100,
        Sector: "霈ｸ騾∫畑讖溷勣",
    })
    if err != nil {
        panic(err)
    }
    
    // 迚ｹ螳壻ｼ∵･ｭ縺ｮ雋｡蜍吶ョ繝ｼ繧ｿ繧貞叙蠕・    financial, err := client.Financial.Get(&xbrl.FinancialOptions{
        CompanyID: "S100LO6W",
        Year: 2023,
    })
    
    // 譛我ｾ｡險ｼ蛻ｸ蝣ｱ蜻頑嶌縺ｮ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ繧貞叙蠕・    document, err := client.Documents.Get(&xbrl.DocumentOptions{
        CompanyID: "S100LO6W",
        Year: 2023,
        Section: "0101010",
    })
}`,
      features: [
        '螳悟・縺ｪ蝙句ｮ牙・諤ｧ',
        '繧ｳ繝ｳ繝・く繧ｹ繝亥ｯｾ蠢・,
        '荳ｦ陦悟・逅・し繝昴・繝・,
        '繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ',
        '繧ｫ繧ｹ繧ｿ繝HTTP繧ｯ繝ｩ繧､繧｢繝ｳ繝・,
        '繝｢繝・け繝・せ繝亥ｯｾ蠢・
      ]
    },
    php: {
      name: 'PHP',
      version: '1.0.0',
      install: 'composer require xbrl-jp/sdk',
      example: `<?php
require_once 'vendor/autoload.php';

use XBRLJP\\Client;

// 繧ｯ繝ｩ繧､繧｢繝ｳ繝医・蛻晄悄蛹・$client = new Client('YOUR_API_KEY');

// 莨∵･ｭ荳隕ｧ繧貞叙蠕・$companies = $client->companies()->list([
    'limit' => 100,
    'sector' => '霈ｸ騾∫畑讖溷勣'
]);

// 迚ｹ螳壻ｼ∵･ｭ縺ｮ雋｡蜍吶ョ繝ｼ繧ｿ繧貞叙蠕・$financial = $client->financial()->get([
    'company_id' => 'S100LO6W',
    'year' => 2023
]);

// 譛我ｾ｡險ｼ蛻ｸ蝣ｱ蜻頑嶌縺ｮ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ繧貞叙蠕・$document = $client->documents()->get([
    'company_id' => 'S100LO6W',
    'year' => 2023,
    'section' => '0101010'
]);

// Laravel邨ｱ蜷・$companies = XBRLJP::companies()->paginate(20);`,
      features: [
        'PSR貅匁侠',
        'Laravel/Symfony邨ｱ蜷・,
        '繧ｭ繝｣繝・す繝･繧ｵ繝昴・繝・,
        '繝壹・繧ｸ繝阪・繧ｷ繝ｧ繝ｳ',
        '繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ',
        'PHPUnit蟇ｾ蠢・
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
        // 繧ｯ繝ｩ繧､繧｢繝ｳ繝医・蛻晄悄蛹・        XBRLClient client = new XBRLClient("YOUR_API_KEY");
        
        // 莨∵･ｭ荳隕ｧ繧貞叙蠕・        CompanyListRequest request = CompanyListRequest.builder()
            .limit(100)
            .sector("霈ｸ騾∫畑讖溷勣")
            .build();
        CompanyListResponse companies = client.companies().list(request);
        
        // 迚ｹ螳壻ｼ∵･ｭ縺ｮ雋｡蜍吶ョ繝ｼ繧ｿ繧貞叙蠕・        FinancialData financial = client.financial()
            .get("S100LO6W", 2023);
        
        // 譛我ｾ｡險ｼ蛻ｸ蝣ｱ蜻頑嶌縺ｮ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ繧貞叙蠕・        Document document = client.documents()
            .get("S100LO6W", 2023, "0101010");
        
        // Spring Boot邨ｱ蜷・        @Autowired
        private XBRLClient xbrlClient;
    }
}`,
      features: [
        '繝薙Ν繝繝ｼ繝代ち繝ｼ繝ｳ',
        'Spring Boot邨ｱ蜷・,
        '髱槫酔譛溘し繝昴・繝茨ｼ・ompletableFuture・・,
        'Jackson騾｣謳ｺ',
        '繧ｫ繧ｹ繧ｿ繝萓句､・,
        'JUnit蟇ｾ蠢・
      ]
    }
  } as const;

  // 蝙句ｮ夂ｾｩ
  type SDKKey = keyof typeof sdks;
  const [selectedLanguage, setSelectedLanguage] = useState<SDKKey>('javascript');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 繝倥ャ繝繝ｼ */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900">
                竊・謌ｻ繧・              </button>
              <h1 className="text-xl font-bold">SDK & 繝ｩ繧､繝悶Λ繝ｪ</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/docs')}
                className="text-gray-600 hover:text-gray-900 px-4 py-2"
              >
                API繝峨く繝･繝｡繝ｳ繝・              </button>
              <button
                onClick={() => router.push('/examples')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                繧ｵ繝ｳ繝励Ν繧ｳ繝ｼ繝・竊・              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 繝偵・繝ｭ繝ｼ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white mb-8">
          <h1 className="text-3xl font-bold mb-4">蜈ｬ蠑輯DK & 繝ｩ繧､繝悶Λ繝ｪ</h1>
          <p className="text-blue-100 mb-6">
            縺雁･ｽ縺ｿ縺ｮ險隱槭〒XBRL雋｡蜍吶ョ繝ｼ繧ｿAPI繧堤ｰ｡蜊倥↓邨ｱ蜷医・br />
            縺吶∋縺ｦ縺ｮSDK縺ｯ縲∝梛螳牙・諤ｧ縲√お繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ縲∬・蜍輔Μ繝医Λ繧､讖溯・繧呈ｨ呎ｺ冶｣・ｙ縲・          </p>
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
              雋｢迪ｮ繧ｬ繧､繝・            </button>
          </div>
        </div>

        {/* 險隱樣∈謚槭ち繝・*/}
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

        {/* SDK繧ｳ繝ｳ繝・Φ繝・*/}
        <div className="bg-white rounded-b-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">{sdks[selectedLanguage].name} SDK</h2>
              <p className="text-gray-600">繝舌・繧ｸ繝ｧ繝ｳ {sdks[selectedLanguage].version}</p>
            </div>
            <div className="flex gap-2">
              <a 
                href={`https://github.com/xbrl-jp/${selectedLanguage}-sdk`}
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub繝ｪ繝昴ず繝医Μ
              </a>
              <a 
                href="#"
                className="text-blue-600 hover:underline"
              >
                隧ｳ邏ｰ繝峨く繝･繝｡繝ｳ繝・              </a>
            </div>
          </div>

          {/* 繧､繝ｳ繧ｹ繝医・繝ｫ */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">繧､繝ｳ繧ｹ繝医・繝ｫ</h3>
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <code className="text-green-400 text-sm">{sdks[selectedLanguage].install}</code>
              <button
                onClick={() => copyToClipboard(sdks[selectedLanguage].install, 'install')}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                {copiedCode === 'install' ? '笨・繧ｳ繝斐・貂医∩' : '繧ｳ繝斐・'}
              </button>
            </div>
          </div>

          {/* 菴ｿ逕ｨ萓・*/}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">菴ｿ逕ｨ萓・/h3>
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <pre className="text-green-400 text-sm overflow-x-auto">
                <code>{sdks[selectedLanguage].example}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(sdks[selectedLanguage].example, 'example')}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                {copiedCode === 'example' ? '笨・繧ｳ繝斐・貂医∩' : '繧ｳ繝斐・'}
              </button>
            </div>
          </div>

          {/* 荳ｻ縺ｪ讖溯・ */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">荳ｻ縺ｪ讖溯・</h3>
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

          {/* 縺昴・莉悶・繝ｪ繧ｽ繝ｼ繧ｹ */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-bold mb-4">縺昴・莉悶・繝ｪ繧ｽ繝ｼ繧ｹ</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="#" className="border rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="text-2xl mb-2">答</div>
                <div className="font-medium">螳悟・繧ｬ繧､繝・/div>
                <div className="text-sm text-gray-600">SDK縺ｮ隧ｳ邏ｰ縺ｪ菴ｿ縺・婿</div>
              </a>
              <a href="#" className="border rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="text-2xl mb-2">肌</div>
                <div className="font-medium">API 繝ｪ繝輔ぃ繝ｬ繝ｳ繧ｹ</div>
                <div className="text-sm text-gray-600">蜈ｨ繝｡繧ｽ繝・ラ縺ｮ隧ｳ邏ｰ</div>
              </a>
              <a href="#" className="border rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="text-2xl mb-2">町</div>
                <div className="font-medium">繧ｳ繝溘Η繝九ユ繧｣</div>
                <div className="text-sm text-gray-600">雉ｪ蝠上ｄ繝・ぅ繧ｹ繧ｫ繝・す繝ｧ繝ｳ</div>
              </a>
            </div>
          </div>
        </div>

        {/* 繧ｳ繝溘Η繝九ユ繧｣SDK */}
        <div className="bg-white rounded-xl p-8 mt-8">
          <h2 className="text-2xl font-bold mb-6">繧ｳ繝溘Η繝九ユ繧｣SDK</h2>
          <p className="text-gray-600 mb-6">
            繧ｳ繝溘Η繝九ユ繧｣縺ｫ繧医▲縺ｦ髢狗匱繝ｻ繝｡繝ｳ繝・リ繝ｳ繧ｹ縺輔ｌ縺ｦ縺・ｋSDK縺ｧ縺吶ょ・蠑上し繝昴・繝医・縺ゅｊ縺ｾ縺帙ｓ縺後∝､壹￥縺ｮ髢狗匱閠・↓蛻ｩ逕ｨ縺輔ｌ縺ｦ縺・∪縺吶・          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Rust SDK</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Community</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">鬮倥ヱ繝輔か繝ｼ繝槭Φ繧ｹ縺ｪRust螳溯｣・/p>
              <a href="#" className="text-blue-600 hover:underline text-sm">github.com/user/xbrl-rust 竊・/a>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Swift SDK</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Community</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">iOS/macOS蜷代￠Swift螳溯｣・/p>
              <a href="#" className="text-blue-600 hover:underline text-sm">github.com/user/xbrl-swift 竊・/a>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">C# SDK</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Community</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">.NET/C#蜷代￠螳溯｣・/p>
              <a href="#" className="text-blue-600 hover:underline text-sm">github.com/user/xbrl-dotnet 竊・/a>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Kotlin SDK</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Community</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Android/Kotlin蜷代￠螳溯｣・/p>
              <a href="#" className="text-blue-600 hover:underline text-sm">github.com/user/xbrl-kotlin 竊・/a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
