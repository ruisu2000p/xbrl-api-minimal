# XBRL Financial API - セットアップガイド

## 🚀 完全セットアップ手順

### 1. Supabaseデータベース設定

1. Supabase ダッシュボードにログイン
2. SQL Editor を開く
3. 以下のSQLファイルを順番に実行：

```sql
-- sql/secure-api-keys-schema.sql の内容を実行
```

### 2. 環境変数設定

`.env.local` ファイルを作成：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zxzyidqrvzfzhicfuhlo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Storage
SUPABASE_STORAGE_BUCKET=markdown-files

# API設定
API_KEY_PREFIX=sk_live_xbrl_
API_RATE_LIMIT_PER_MIN=60
```

### 3. Vercel環境変数設定

Vercelダッシュボードで同じ環境変数を設定：
1. Settings → Environment Variables
2. 上記の環境変数を全て追加
3. 再デプロイ

### 4. APIキー発行フロー

#### A. ユーザー登録
```bash
# /register ページでアカウント作成
# または API経由で登録
```

#### B. APIキー発行
```bash
# ログイン後
curl -X POST https://xbrl-api-minimal.vercel.app/api/v1/apikeys \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Claude Desktop","scopes":["read:markdown"]}'

# レスポンス例
{
  "id": "uuid",
  "apiKey": "sk_live_xbrl_xxxxx...", # ⚠️ この値は二度と表示されない
  "apiKeyMasked": "sk_live_xbrl_xxxx...xxxx",
  "scopes": ["read:markdown"],
  "expiresAt": "2026-01-01T00:00:00Z"
}
```

### 5. Claude Desktop設定

#### A. MCPサーバー設定ファイル作成

`%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "node",
      "args": ["C:/Users/pumpk/Downloads/xbrl-api-minimal/mcp-server-secure.js"],
      "env": {
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
        "XBRL_API_KEY": "sk_live_xbrl_YOUR_ACTUAL_KEY_HERE"
      }
    }
  }
}
```

#### B. Claude Desktop再起動

1. Claude Desktopを完全に終了
2. 再起動
3. MCPツールが表示されることを確認

### 6. 動作確認

#### A. API直接テスト
```bash
# Markdown検索
curl "https://xbrl-api-minimal.vercel.app/api/v1/markdown/search?q=トヨタ" \
  -H "Authorization: Bearer sk_live_xbrl_YOUR_KEY"

# ドキュメント取得
curl "https://xbrl-api-minimal.vercel.app/api/v1/markdown/[DOC_ID]" \
  -H "Authorization: Bearer sk_live_xbrl_YOUR_KEY"
```

#### B. Claude Desktop確認

Claude に以下を入力：
```
xbrl-financial.get_api_status で接続を確認してください
```

成功すると：
```json
{
  "status": "connected",
  "apiUrl": "https://xbrl-api-minimal.vercel.app/api/v1",
  "keyPrefix": "sk_live_xbrl_...",
  "message": "API connection successful"
}
```

## 📊 利用可能なMCPツール

### 1. search_markdown
```
企業の財務ドキュメントを検索
パラメータ:
- q: 検索キーワード
- company_code: 企業コード（7203など）
- fiscal_year: 会計年度（2021など）
- limit: 最大件数（デフォルト20）
```

### 2. get_markdown
```
ドキュメントの本文を取得
パラメータ:
- id: ドキュメントID（search_markdownで取得）
```

### 3. list_companies
```
企業一覧を取得
パラメータ:
- page: ページ番号
- per_page: 1ページあたりの件数
```

### 4. get_api_status
```
API接続状態を確認
パラメータ: なし
```

## 🔒 セキュリティ

1. **APIキーは平文で保存されない**
   - データベースにはSHA256ハッシュのみ保存
   - 発行時のみ平文を返す

2. **レート制限**
   - デフォルト: 60リクエスト/分
   - 環境変数で調整可能

3. **有効期限**
   - デフォルト: 365日
   - 期限切れキーは自動的に無効化

4. **アクセスログ**
   - 全APIアクセスを記録
   - 不正利用の追跡が可能

## 🛠️ トラブルシューティング

### APIキーが無効と表示される
- キーの前後に空白がないか確認
- `Bearer ` プレフィックスが正しいか確認
- キーが失効していないか確認

### レート制限エラー
- 1分間待ってから再試行
- 必要に応じて制限値を調整

### Claude Desktopでツールが表示されない
1. 設定ファイルのパスを確認
2. Claude Desktopを完全再起動
3. MCPサーバーのログを確認

## 📝 データ投入手順（管理者向け）

### Markdownファイルのアップロード

```javascript
// scripts/upload-markdown-to-storage.js を実行
node scripts/upload-markdown-to-storage.js
```

これにより：
1. ローカルのMarkdownファイルをSupabase Storageにアップロード
2. documentsテーブルにメタデータを登録
3. 検索可能な状態になる

## 🎯 使用例

### Claude Desktopでの使用例

```
「トヨタの2021年度の有価証券報告書を検索してください」

1. search_markdown で q="トヨタ", fiscal_year="2021" を検索
2. 結果からドキュメントIDを取得
3. get_markdown でドキュメント本文を取得
4. 内容を分析・要約
```

## 📞 サポート

問題が発生した場合：
1. APIステータスを確認: `get_api_status`
2. ログを確認: Supabaseダッシュボード → Logs
3. 環境変数を再確認
4. Vercelのデプロイログを確認