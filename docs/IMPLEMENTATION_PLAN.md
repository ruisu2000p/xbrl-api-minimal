# XBRL API 実装計画

## 現在の状況
- フロントエンド: ✅ 完成（Vercel上で公開）
- バックエンドAPI: ❌ 未実装
- データベース: ❌ 未実装
- MCP連携: ❌ 未実装

## 必要な実装

### 1. バックエンドAPI構築

#### Option A: Vercel Functions (推奨)
```javascript
// api/v1/companies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  // APIキー認証
  const apiKey = request.headers.get('X-API-Key');
  if (!validateApiKey(apiKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // ローカルMDファイルを読み込み
  const mdPath = 'path/to/markdown/files';
  const companies = await fs.readdir(mdPath);
  
  return NextResponse.json({ companies });
}
```

#### Option B: 別サーバー (Express.js)
```javascript
// server.js
const express = require('express');
const fs = require('fs/promises');
const app = express();

app.get('/api/v1/companies/:id', async (req, res) => {
  const { id } = req.params;
  const mdContent = await fs.readFile(`./data/${id}.md`, 'utf-8');
  res.json({ content: mdContent });
});
```

### 2. データ保存方法

#### Option A: Supabase Storage (推奨)
- MDファイルをSupabase Storageにアップロード
- メタデータをPostgreSQLに保存
- 高速なクエリとフルテキスト検索

```sql
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT,
  sector TEXT,
  markdown_url TEXT,
  metadata JSONB
);
```

#### Option B: GitHub Repository
- MDファイルをGitHubリポジトリに保存
- GitHub APIで取得
- 無料で簡単

#### Option C: Cloudflare R2
- 大容量ファイル対応
- 安価なオブジェクトストレージ
- 高速なCDN配信

### 3. ローカルデータのアップロード

```javascript
// scripts/upload-markdown.js
const fs = require('fs/promises');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(url, key);

async function uploadMarkdownFiles() {
  const baseDir = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発/2021_4_1から2022_3_31有価証券報告書Markdown';
  const files = await fs.readdir(baseDir);
  
  for (const file of files) {
    const content = await fs.readFile(`${baseDir}/${file}`, 'utf-8');
    
    // Supabase Storageにアップロード
    await supabase.storage
      .from('markdown')
      .upload(file, content);
    
    // メタデータをDBに保存
    await supabase
      .from('companies')
      .insert({ 
        id: file.replace('.md', ''),
        markdown_url: `storage/markdown/${file}`
      });
  }
}
```

### 4. Claude MCP連携

#### MCP Server設定
```json
{
  "mcpServers": {
    "xbrl-api": {
      "command": "node",
      "args": ["mcp-server.js"],
      "env": {
        "API_KEY": "xbrl_live_xxxxx",
        "API_URL": "https://your-app.vercel.app/api/v1"
      }
    }
  }
}
```

#### MCP Server実装
```javascript
// mcp-server.js
const { MCPServer } = require('@modelcontextprotocol/sdk');

const server = new MCPServer({
  name: 'xbrl-api',
  version: '1.0.0'
});

server.addTool({
  name: 'get_company_data',
  description: '企業の財務データを取得',
  parameters: {
    company_id: { type: 'string', required: true }
  },
  execute: async ({ company_id }) => {
    const response = await fetch(`${process.env.API_URL}/companies/${company_id}`, {
      headers: { 'X-API-Key': process.env.API_KEY }
    });
    return await response.json();
  }
});

server.start();
```

## 推奨実装手順

### Phase 1: Vercel Functionsでシンプルなデモ
1. MDファイルを1社分だけGitHubにコミット
2. Vercel FunctionでそのファイルをAPIで返す
3. APIキー認証を実装

### Phase 2: データベース統合
1. Supabaseセットアップ
2. MDファイルをStorageにアップロード
3. メタデータをDBに保存

### Phase 3: MCP対応
1. MCP Serverを作成
2. npm パッケージとして公開
3. ユーザーがインストールして使用

## コスト試算

### Supabase
- Free: 500MB ストレージ、2GB帯域幅
- Pro: $25/月、8GB ストレージ、250GB帯域幅

### Vercel
- Hobby: 無料、100GB帯域幅
- Pro: $20/月、1TB帯域幅

### 推定必要容量
- 4,231社 × 平均1MB = 約4.2GB
- 月間1000ユーザー × 10回 = 約40GB帯域幅

**推奨プラン**: Supabase Pro + Vercel Pro = $45/月

## 次のステップ

1. **最小限の実装から開始**
   - 1社分のデータでデモAPI作成
   - Vercel Functionsで実装
   - 動作確認

2. **段階的な拡張**
   - 10社 → 100社 → 全社
   - パフォーマンステスト
   - 最適化

3. **MCP公開**
   - npmパッケージ作成
   - ドキュメント整備
   - コミュニティ公開