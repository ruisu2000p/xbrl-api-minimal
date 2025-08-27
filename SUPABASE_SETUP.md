# Supabase直接接続MCPサーバー設定ガイド

## 🎯 概要

このMCPサーバーは**Supabaseに直接接続**して、財務データにアクセスします。

```
Claude Desktop → MCPサーバー → Supabase (データベース + Storage)
```

## 🔑 必要な認証情報

Supabaseダッシュボードから以下を取得：

1. **Supabase URL**
   - https://zxzyidqrvzfzhicfuhlo.supabase.co

2. **Anon Key**（公開用）
   - Project Settings → API → anon/public

3. **Service Role Key**（推奨・全権限）
   - Project Settings → API → service_role

## 📦 セットアップ手順

### 1. 依存関係インストール

```bash
cd xbrl-mcp-server
npm install
```

### 2. Claude Desktop設定

`%APPDATA%\Claude\claude_desktop_config.json`を編集：

```json
{
  "mcpServers": {
    "xbrl-supabase": {
      "command": "node",
      "args": ["C:\\Users\\pumpk\\Downloads\\xbrl-mcp-server\\index-supabase.js"],
      "env": {
        "SUPABASE_URL": "https://zxzyidqrvzfzhicfuhlo.supabase.co",
        "SUPABASE_SERVICE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}
```

### 3. 環境変数の説明

| 変数名 | 必須 | 説明 |
|--------|------|------|
| SUPABASE_URL | ✅ | SupabaseプロジェクトのURL |
| SUPABASE_SERVICE_KEY | ⭐ | Service Roleキー（全データアクセス可能） |
| SUPABASE_ANON_KEY | ⭕ | Anonキー（Service Keyがない場合の代替） |

**注意**: Service Role Keyを使用すると、Row Level Security (RLS)を回避して全データにアクセスできます。

### 4. Claude Desktop再起動

設定を反映させるため、完全に再起動してください。

## 🗄️ Supabaseのデータ構造

### データベース（PostgreSQL）
```sql
-- companiesテーブル
- id (企業ID: S100LJ4F等)
- company_name (企業名)
- ticker_symbol (ティッカーシンボル)
- industry_category (業種)
- sector (セクター)
```

### Storage（markdown-files バケット）
```
markdown-files/
├── 2021/
│   └── S100LJ4F/  # 亀田製菓
│       ├── 0101010_honbun_*.md  # 企業概況
│       ├── 0102010_honbun_*.md  # 事業の状況
│       ├── 0105010_honbun_*.md  # 経理の状況
│       └── ...
├── FY2016/
├── FY2017/
└── ...
```

## 🛠️ 利用可能なツール

### 1. search_companies
```
「亀田」を含む企業を検索して
→ Supabaseのcompaniesテーブルから直接検索
```

### 2. get_company_details
```
S100LJ4Fの詳細を教えて
→ companiesテーブルから企業情報取得
```

### 3. get_financial_documents
```
亀田製菓の2021年のドキュメント一覧を見せて
→ Storageからファイル一覧取得
```

### 4. read_financial_document
```
亀田製菓の経理状況を読んで
→ Storageから特定のMarkdownファイル読込
```

### 5. analyze_financial_data
```
S100LJ4Fの財務分析をして
→ Storageから財務データを取得して分析
```

## 🔍 トラブルシューティング

### 接続エラー
```
Supabase接続エラー: ...
```
→ Service KeyまたはAnon Keyが正しく設定されているか確認

### データが見つからない
```
企業ID XXX の情報が見つかりませんでした
```
→ 企業IDが正しいか確認（例: S100LJ4F）

### ファイルが見つからない
```
ドキュメントが見つかりませんでした
```
→ 年度指定を確認（2021, FY2021等）

## 📊 データ確認方法

### Supabaseダッシュボードで確認
1. https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo
2. Table Editor → companies（企業一覧）
3. Storage → markdown-files（ドキュメント）

### SQLエディタで確認
```sql
-- 企業数を確認
SELECT COUNT(*) FROM companies;

-- 特定企業を検索
SELECT * FROM companies WHERE company_name LIKE '%亀田%';
```

## 🔐 セキュリティ注意事項

- Service Role Keyは**絶対に公開しない**
- Gitにコミットしない（.gitignoreに追加）
- 本番環境では環境変数で管理

## 📝 使用例

Claude Desktopで以下のように質問：

```
👤: 亀田製菓の情報を教えて
🤖: search_companies と get_company_details を使用...

👤: S100LJ4Fの2021年の財務データを分析して
🤖: analyze_financial_data を使用...

👤: 食品業界の企業を5社リストアップして
🤖: search_companies で業種フィルタ...
```

---

最終更新: 2025年8月27日