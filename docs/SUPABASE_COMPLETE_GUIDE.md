# Supabase完全セットアップガイド

## 📋 このガイドについて

このガイドでは、ローカルにある4,231社のXBRL Markdownデータを、Supabaseを使用してWeb APIとして公開する手順を説明します。

## 🎯 ゴール

1. ローカルのMarkdownファイルをSupabaseにアップロード
2. APIエンドポイントをSupabase経由でデータ提供
3. Claude Desktop MCPと連携可能にする

## 📝 前提条件

- Node.js 18以上
- Supabaseアカウント（無料プランでOK）
- ローカルのMarkdownファイル（4,231社分）

---

## 🚀 ステップ1: Supabaseプロジェクト作成

### 1.1 アカウント作成
1. [https://supabase.com](https://supabase.com) にアクセス
2. GitHubアカウントでサインイン
3. 「New project」をクリック

### 1.2 プロジェクト設定
```
Organization: あなたの組織名
Project name: xbrl-api
Database Password: 強力なパスワード（保存必須！）
Region: Asia Northeast (Tokyo)
Pricing Plan: Free tier
```

### 1.3 API情報取得
プロジェクトダッシュボード → Settings → API から：
- **Project URL**: `https://xxxxx.supabase.co`
- **Anon Key**: `eyJhbGc...`（公開用）
- **Service Role Key**: `eyJhbGc...`（管理用・秘密）

---

## 🗄️ ステップ2: データベース設定

### 2.1 SQLエディタを開く
1. Supabaseダッシュボード → SQL Editor
2. 「New query」をクリック

### 2.2 スキーマ作成
以下のSQLを実行：

```sql
-- 企業マスタテーブル
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  ticker TEXT UNIQUE,
  name TEXT NOT NULL,
  sector TEXT,
  market TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 財務レポートテーブル
CREATE TABLE financial_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  fiscal_period TEXT,
  doc_type TEXT CHECK (doc_type IN ('public', 'audit')),
  markdown_content TEXT,
  storage_path TEXT,
  financial_data JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, fiscal_year, doc_type)
);

-- インデックス作成
CREATE INDEX idx_companies_ticker ON companies(ticker);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_financial_reports_company_year 
  ON financial_reports(company_id, fiscal_year);
```

### 2.3 Storage設定
1. Supabaseダッシュボード → Storage
2. 「New bucket」をクリック
3. 設定：
   ```
   Name: markdown-files
   Public: OFF
   File size limit: 50MB
   Allowed MIME types: text/markdown, text/plain
   ```

---

## 🔧 ステップ3: ローカル環境設定

### 3.1 環境変数ファイル作成
`.env.local`ファイルを作成：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...公開キー
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...サービスロールキー

# API設定
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NODE_ENV=development
```

### 3.2 依存関係インストール
```bash
npm install @supabase/supabase-js dotenv
```

---

## 📤 ステップ4: データアップロード

### 4.1 アップロードスクリプト準備
`scripts/upload-to-supabase.js`が既に作成済みです。

### 4.2 テストアップロード（最初の10社）
```bash
node scripts/upload-to-supabase.js
```

成功すると以下のような出力：
```
===========================================
XBRL Markdown アップロードスクリプト
===========================================
📁 4231社のデータを検出しました
処理範囲: 1社目 〜 100社目

バッチ 1: 1〜10社目を処理中...
✅ 進捗: 10/100社完了, エラー: 0件
```

### 4.3 全社アップロード
スクリプトの`END_INDEX`を変更：
```javascript
const END_INDEX = 4231; // 全社処理
```

再実行：
```bash
node scripts/upload-to-supabase.js
```

---

## 🔌 ステップ5: API統合

### 5.1 既存APIをSupabase版に切り替え

#### 企業一覧API
`app/api/v1/companies/route.ts`を`supabase-route.ts`の内容で置き換え：

```bash
# バックアップ作成
cp app/api/v1/companies/route.ts app/api/v1/companies/route.backup.ts

# Supabase版に置き換え
cp app/api/v1/companies/supabase-route.ts app/api/v1/companies/route.ts
```

#### 企業詳細API
```bash
# バックアップ作成
cp app/api/v1/companies/[id]/route.ts app/api/v1/companies/[id]/route.backup.ts

# Supabase版に置き換え
cp app/api/v1/companies/[id]/supabase-route.ts app/api/v1/companies/[id]/route.ts
```

### 5.2 動作確認
```bash
# 開発サーバー起動
npm run dev

# 別ターミナルでテスト
curl http://localhost:3000/api/v1/companies \
  -H "X-API-Key: xbrl_live_test"
```

---

## 🔐 ステップ6: APIキー管理

### 6.1 APIキーをSupabaseに登録
SQLエディタで実行：

```sql
-- テスト用APIキー登録
INSERT INTO api_keys (
  key_hash,
  user_email,
  plan,
  is_active,
  monthly_limit
) VALUES (
  encode('xbrl_live_test'::bytea, 'base64'),
  'test@example.com',
  'beta',
  true,
  1000
);
```

### 6.2 本番用APIキー登録
ユーザー登録時に自動生成されるAPIキーをSupabaseに保存するよう、
`app/api/auth/register/route.ts`を更新済み。

---

## 🌐 ステップ7: 本番デプロイ

### 7.1 Vercelにデプロイ
```bash
# Vercel CLIインストール（未インストールの場合）
npm i -g vercel

# デプロイ
vercel --prod
```

### 7.2 環境変数設定
Vercel Dashboard → Settings → Environment Variables：

```
NEXT_PUBLIC_SUPABASE_URL = あなたのSupabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY = あなたの公開キー
SUPABASE_SERVICE_ROLE_KEY = あなたのサービスロールキー（Secret）
```

---

## 🔗 ステップ8: Claude MCP連携

### 8.1 MCPサーバー作成
`mcp-server/index.js`：

```javascript
const { MCPServer } = require('@modelcontextprotocol/sdk');

const server = new MCPServer({
  name: 'xbrl-api',
  version: '1.0.0'
});

server.addTool({
  name: 'get_company_financial_data',
  description: '企業の財務データをMarkdown形式で取得',
  parameters: {
    company_id: { 
      type: 'string', 
      required: true,
      description: '企業ID（例: 7203）またはティッカーコード'
    }
  },
  execute: async ({ company_id }) => {
    const response = await fetch(
      `${process.env.API_URL}/companies/${company_id}`,
      {
        headers: { 
          'X-API-Key': process.env.API_KEY 
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  }
});

server.start();
```

### 8.2 Claude Desktop設定
`claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "xbrl-api": {
      "command": "node",
      "args": ["path/to/mcp-server/index.js"],
      "env": {
        "API_KEY": "xbrl_live_あなたのAPIキー",
        "API_URL": "https://your-app.vercel.app/api/v1"
      }
    }
  }
}
```

---

## 📊 ステップ9: モニタリング

### 9.1 使用状況確認
Supabaseダッシュボードで確認：
- Database → Tables → api_usage_logs
- Storage → markdown-files → Usage

### 9.2 SQLでの統計確認
```sql
-- API使用状況
SELECT 
  DATE(created_at) as date,
  COUNT(*) as api_calls,
  COUNT(DISTINCT api_key_id) as unique_users
FROM api_usage_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 人気企業ランキング
SELECT 
  company_id,
  COUNT(*) as access_count
FROM api_usage_logs
WHERE endpoint LIKE '%/companies/%'
GROUP BY company_id
ORDER BY access_count DESC
LIMIT 10;
```

---

## 🚨 トラブルシューティング

### CORS エラー
Supabase Dashboard → Authentication → URL Configuration：
```
Site URL: https://your-app.vercel.app
Redirect URLs: https://your-app.vercel.app/*
```

### Storage アクセスエラー
1. RLS（Row Level Security）を一時的に無効化：
```sql
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

### APIキー認証エラー
開発環境では`NODE_ENV=development`を設定して認証をスキップ。

### アップロードエラー
- ファイルサイズ制限（50MB）を確認
- ネットワークタイムアウトの場合はバッチサイズを小さく

---

## 💰 コスト管理

### 無料プラン制限
- Database: 500MB
- Storage: 1GB
- 帯域幅: 2GB/月
- API呼び出し: 無制限

### 使用量見積もり
- 4,231社 × 1MB = 約4.2GB（Storage）
- 月1000ユーザー × 10回 = 約40GB帯域幅

### 推奨アップグレード時期
- Storage使用量が900MBを超えたら
- 月間帯域幅が1.8GBを超えたら
- Pro Plan（$25/月）へアップグレード

---

## ✅ チェックリスト

- [ ] Supabaseプロジェクト作成
- [ ] データベーススキーマ作成
- [ ] Storageバケット作成
- [ ] 環境変数設定
- [ ] 最初の10社アップロード成功
- [ ] API動作確認（ローカル）
- [ ] Vercelデプロイ
- [ ] 本番API動作確認
- [ ] Claude MCP連携テスト
- [ ] 全社データアップロード

---

## 📚 参考リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Vercel Documentation](https://vercel.com/docs)
- [Model Context Protocol](https://github.com/anthropics/model-context-protocol)

---

## 🆘 サポート

問題が発生した場合：
1. エラーメッセージをコピー
2. `scripts/upload-to-supabase.js`のログを確認
3. Supabaseダッシュボードのログを確認
4. 環境変数が正しく設定されているか確認

最終更新: 2025年8月14日