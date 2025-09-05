# 🚀 XBRL Financial API - デプロイメントガイド

## 目次
1. [クイックスタート](#クイックスタート)
2. [詳細セットアップ](#詳細セットアップ)
3. [トラブルシューティング](#トラブルシューティング)
4. [本番環境チェックリスト](#本番環境チェックリスト)

---

## クイックスタート

### 前提条件
- Node.js 18以上
- Supabaseアカウント
- Vercelアカウント（オプション）

### 1分でセットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/ruisu2000p/xbrl-api-minimal.git
cd xbrl-api-minimal

# 2. 依存関係をインストール
npm install

# 3. 環境変数を設定
cp .env.example .env.local
# .env.localを編集してSupabaseの認証情報を入力

# 4. 開発サーバーを起動
npm run dev
```

---

## 詳細セットアップ

### ステップ1: Supabaseプロジェクト作成

1. [Supabase](https://supabase.com)にログイン
2. 新しいプロジェクトを作成
3. Settings → API から以下をコピー：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### ステップ2: データベーススキーマ設定

```sql
-- Supabase SQL Editorで実行
-- sql/secure-api-keys-schema.sql の内容をコピー＆ペースト
```

または、コマンドラインから：

```bash
# Supabase CLIを使用（要インストール）
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### ステップ3: 環境変数設定

`.env.local`ファイルを作成：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Storage
SUPABASE_STORAGE_BUCKET=markdown-files

# API設定
API_KEY_PREFIX=sk_live_xbrl_
API_RATE_LIMIT_PER_MIN=60
```

### ステップ4: 初期セットアップ実行

```bash
# セットアップスクリプトを実行
npm run setup:secure

# これにより以下が実行されます：
# - Storageバケット作成
# - サンプルドキュメント作成
# - 必要なインデックス作成
```

### ステップ5: 開発サーバー起動

```bash
npm run dev
# http://localhost:3000 でアクセス
```

---

## Vercelへのデプロイ

### オプション1: Vercel CLIを使用

```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ
vercel

# 環境変数を設定
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
# 他の環境変数も同様に追加

# 本番環境にデプロイ
vercel --prod
```

### オプション2: GitHub連携

1. GitHubにリポジトリをプッシュ
2. [Vercel Dashboard](https://vercel.com/dashboard)でImport
3. 環境変数を設定
4. Deploy

---

## APIキー発行と使用

### 1. ユーザー登録

```bash
# ブラウザで http://localhost:3000/register にアクセス
# または APIで登録
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### 2. APIキー発行

```bash
# ログイン後のセッションCookieを使用
curl -X POST http://localhost:3000/api/v1/apikeys \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Claude Desktop",
    "scopes": ["read:markdown"]
  }'

# レスポンス
{
  "apiKey": "sk_live_xbrl_abc123...",  # この値を安全に保存
  "id": "...",
  "scopes": ["read:markdown"]
}
```

### 3. APIキー使用

```bash
# Markdown検索
curl "http://localhost:3000/api/v1/markdown/search?q=トヨタ" \
  -H "Authorization: Bearer sk_live_xbrl_abc123..."

# ドキュメント取得
curl "http://localhost:3000/api/v1/markdown/[DOC_ID]" \
  -H "Authorization: Bearer sk_live_xbrl_abc123..."
```

---

## Claude Desktop設定

### 1. 設定ファイル作成

Windows: `%APPDATA%\Claude\claude_desktop_config.json`
Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "node",
      "args": ["C:/path/to/mcp-server-secure.js"],
      "env": {
        "XBRL_API_URL": "https://your-app.vercel.app/api/v1",
        "XBRL_API_KEY": "sk_live_xbrl_YOUR_KEY"
      }
    }
  }
}
```

### 2. Claude Desktop再起動

### 3. 動作確認

Claudeで以下を実行：
```
xbrl-financial.get_api_status で接続を確認
```

---

## トラブルシューティング

### よくある問題と解決方法

#### 1. Supabase接続エラー

```
Error: Missing SUPABASE_SERVICE_ROLE_KEY
```

**解決方法:**
- `.env.local`ファイルが存在することを確認
- 環境変数が正しく設定されているか確認
- サーバーを再起動

#### 2. APIキー認証エラー

```
Error: Invalid API key
```

**解決方法:**
- APIキーの前後に空白がないか確認
- `Bearer `プレフィックスが正しいか確認
- APIキーが失効していないか確認

#### 3. レート制限エラー

```
Error: Rate limit exceeded
```

**解決方法:**
- 1分間待ってから再試行
- `API_RATE_LIMIT_PER_MIN`環境変数を調整

#### 4. CORS エラー

```
Access-Control-Allow-Origin error
```

**解決方法:**
- `vercel.json`のCORS設定を確認
- APIエンドポイントにOPTIONSハンドラーがあることを確認

---

## 本番環境チェックリスト

### セキュリティ

- [ ] 環境変数が本番用に設定されている
- [ ] `SUPABASE_SERVICE_ROLE_KEY`がサーバー側のみで使用されている
- [ ] RLS（Row Level Security）が有効になっている
- [ ] APIキーのレート制限が適切に設定されている
- [ ] HTTPSが有効になっている

### パフォーマンス

- [ ] データベースインデックスが作成されている
- [ ] キャッシュ戦略が実装されている
- [ ] CDNが設定されている（Vercel自動）
- [ ] 画像最適化が有効（Next.js自動）

### 監視

- [ ] エラーログ収集が設定されている
- [ ] APIアクセスログが記録されている
- [ ] アラート通知が設定されている
- [ ] バックアップが定期的に実行されている

### ドキュメント

- [ ] APIドキュメントが最新
- [ ] 環境変数の説明が完備
- [ ] トラブルシューティングガイドが用意されている
- [ ] 連絡先情報が明記されている

---

## サポート

### リソース

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [MCP Documentation](https://modelcontextprotocol.io)

### 問題報告

- GitHub Issues: https://github.com/ruisu2000p/xbrl-api-minimal/issues
- Email: support@example.com

### コミュニティ

- Discord: [Join our server](https://discord.gg/example)
- Twitter: [@xbrlapi](https://twitter.com/xbrlapi)

---

## 更新履歴

- **v2.0.0** (2025-01) - セキュアAPIキー管理システム実装
- **v1.0.0** (2024-12) - 初回リリース

---

最終更新: 2025年1月