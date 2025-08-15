# 本番環境デプロイ手順

## 📋 デプロイ前チェックリスト

### 1. Supabaseデータベースセットアップ
```sql
-- 1. Supabase Dashboard > SQL Editor で以下を実行
-- 基本テーブル
sql/setup-supabase-schema.sql
-- 管理者テーブル
sql/admin-tables.sql
```

### 2. 環境変数の確認
`.env.local`の内容をVercelの環境変数に設定:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 🚀 Vercelへのデプロイ

### オプション1: GitHub連携（推奨）

1. **GitHubにプッシュ**
```bash
git add .
git commit -m "Add admin dashboard and prepare for production deployment"
git push origin main
```

2. **Vercelでインポート**
- https://vercel.com/new にアクセス
- GitHubリポジトリを選択
- 環境変数を設定
- Deployをクリック

### オプション2: Vercel CLI

```bash
# Vercel CLIインストール（未インストールの場合）
npm i -g vercel

# デプロイ
vercel --prod

# 環境変数設定
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

## 📊 管理者ダッシュボードアクセス

### 1. 管理者アカウント作成

Supabase SQL Editorで実行:
```sql
-- 管理者ユーザー作成
INSERT INTO users (
  email, 
  name, 
  role, 
  subscription_plan, 
  is_active,
  join_date
) VALUES (
  'admin@xbrl-api.com',
  '管理者',
  'admin',
  'pro',
  true,
  NOW()
);
```

### 2. アクセスURL
- 本番: `https://xbrl-api-minimal.vercel.app/admin`
- ローカル: `http://localhost:3000/admin`

## 🔐 セキュリティ設定

### 1. CORS設定
`next.config.js`で本番ドメインを追加:
```javascript
const allowedOrigins = [
  'https://xbrl-api-minimal.vercel.app',
  'https://yourdomain.com'
];
```

### 2. レート制限
Vercel Edgeで自動適用

### 3. APIキー管理
- 本番環境では必ずAPIキー認証を有効化
- 開発環境チェックを削除

## 📈 モニタリング

### Vercel Analytics
- https://vercel.com/dashboard でアクセス
- Real-time analytics確認
- Error tracking確認

### Supabase Dashboard
- https://supabase.com/dashboard でアクセス
- Database使用状況確認
- Storage使用状況確認

## 🔄 継続的デプロイメント

GitHubにプッシュすると自動デプロイ:
```bash
# 機能追加
git add .
git commit -m "Add new feature"
git push origin main

# プレビューデプロイ（ブランチ作成）
git checkout -b feature/new-feature
git push origin feature/new-feature
```

## 📝 デプロイ後の確認事項

1. **APIエンドポイント確認**
```bash
# ヘルスチェック
curl https://xbrl-api-minimal.vercel.app/api/health

# 企業一覧（APIキー必要）
curl -H "X-API-Key: your_api_key" \
  https://xbrl-api-minimal.vercel.app/api/v1/companies
```

2. **管理者ダッシュボード確認**
- ログイン機能
- ユーザー管理
- 統計表示
- API監視

3. **パフォーマンス確認**
- 応答時間
- エラー率
- 同時接続数

## 🆘 トラブルシューティング

### ビルドエラー
```bash
# ローカルでビルド確認
npm run build
```

### 環境変数エラー
- Vercel Dashboard > Settings > Environment Variables確認
- 全ての必須変数が設定されているか確認

### データベース接続エラー
- Supabase URL/キーの確認
- ネットワーク設定確認

## 📞 サポート

- GitHub Issues: https://github.com/ruisu2000p/xbrl-api-minimal/issues
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support