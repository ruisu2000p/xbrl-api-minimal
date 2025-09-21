# ローカル→リモートデプロイフロー

## 概要
XBRL APIプロジェクトをローカル開発環境からリモート本番環境（Vercel）にデプロイするための完全ガイドです。

## 前提条件

### 必要なツール
- Node.js (v18以上)
- npm
- Vercel CLI (`npm install -g vercel`)
- Git

### 環境設定
- Supabase プロジェクト: `wpwqxhyiglbtlaimrjrx`
- Vercel プロジェクト: `xbrl-api-minimal`

## ローカル開発環境設定

### 1. 環境変数の設定

`.env.local`ファイルが正しく設定されていることを確認：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs

# Service Role Key（ローカル開発用）
SUPABASE_SERVICE_ROLE_KEY=
# API Key管理用の秘密鍵
API_KEY_SECRET=development_local_secret_key_minimum_32_chars_for_hmac_sha256

# アプリケーション設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 2. ローカル開発サーバーの起動

```bash
cd /c/Users/pumpk/xbrl-api-minimal
npm run dev
```

サーバーは `http://localhost:3000` (または利用可能な次のポート)で起動します。

### 3. ローカル環境でのテスト

```bash
# APIエンドポイントのテスト
curl -X GET "http://localhost:3000/api/v1/companies?limit=3" \
  -H "X-API-Key: xbrl_live_v1_c9490cdd-798d-4f6d-b8af-d8417bad6cf4_DRiu6Iyj2SXT5XRwQwO43Ab2MbilYjtA"

# ヘルスチェック
curl http://localhost:3000/api/health
```

## リモートデプロイフロー

### 1. Vercel設定の確認

```bash
# Vercelプロジェクトとリンク確認
vercel --prod --confirm

# 環境変数の確認
vercel env ls
```

### 2. 本番環境用環境変数の設定

Vercelダッシュボードまたはコマンドラインで以下を設定：

```bash
# 本番用環境変数を設定
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add API_KEY_SECRET production
vercel env add NEXT_PUBLIC_APP_URL production
```

### 3. プレビューデプロイ

```bash
# プレビュー環境にデプロイ
vercel

# デプロイされたURLでテスト
curl -X GET "https://your-preview-url.vercel.app/api/v1/companies?limit=3" \
  -H "X-API-Key: xbrl_live_v1_c9490cdd-798d-4f6d-b8af-d8417bad6cf4_DRiu6Iyj2SXT5XRwQwO43Ab2MbilYjtA"
```

### 4. 本番デプロイ

```bash
# 本番環境にデプロイ
vercel --prod

# 本番URLでテスト
curl -X GET "https://xbrl-api-minimal.vercel.app/api/v1/companies?limit=3" \
  -H "X-API-Key: xbrl_live_v1_c9490cdd-798d-4f6d-b8af-d8417bad6cf4_DRiu6Iyj2SXT5XRwQwO43Ab2MbilYjtA"
```

## 開発ワークフロー

### 1. 日常の開発フロー

```bash
# 1. ローカルで開発
npm run dev

# 2. 変更をテスト
npm run test
npm run lint
npm run build

# 3. Gitにコミット
git add .
git commit -m "feat: 新機能追加"
git push origin main

# 4. 自動デプロイ確認
# VercelはGitHubと連携して自動デプロイされます
```

### 2. 機能開発のベストプラクティス

```bash
# フィーチャーブランチで開発
git checkout -b feature/new-api-endpoint

# ローカルで開発・テスト
npm run dev
npm run test

# プレビューデプロイでテスト
vercel

# メインブランチにマージ
git checkout main
git merge feature/new-api-endpoint
git push origin main
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. 環境変数が認識されない
```bash
# 環境変数を確認
echo $NEXT_PUBLIC_SUPABASE_URL

# .env.localを再読み込み
npm run dev
```

#### 2. APIキーが無効
- Supabaseでキーが有効か確認
- 環境変数の設定を確認
- データベースにAPIキーが登録されているか確認

#### 3. デプロイが失敗
```bash
# Vercelログを確認
vercel logs

# ビルドエラーを確認
npm run build
```

#### 4. middlewareのEvalError
```bash
# middlewareを一時的に無効化
mv middleware.ts middleware.ts.backup

# 修正後に復元
mv middleware.ts.backup middleware.ts
```

## セキュリティ注意事項

### 1. 環境変数の管理
- `.env.local`は**絶対に**Gitにコミットしない
- 本番用Service Role Keyは厳重に管理
- API_KEY_SECRETは32文字以上の強力な文字列を使用

### 2. APIキーの運用
- 長い形式のAPIキー（`xbrl_live_v1_*`）のみ使用
- 短い形式のAPIキーは削除済み
- 定期的なAPIキーのローテーション

### 3. CORS設定
- 本番環境では適切なオリジンのみ許可
- 開発環境では`localhost`のみ許可

## パフォーマンス最適化

### 1. ビルド最適化
```bash
# 本番ビルドのテスト
npm run build
npm run start

# バンドルサイズの確認
npm run analyze
```

### 2. データベース最適化
- APIキー検証の高速化
- インデックスの適切な設定
- クエリの最適化

## モニタリング

### 1. Vercelダッシュボード
- 関数の実行時間
- エラー率
- トラフィック監視

### 2. Supabaseダッシュボード
- データベースパフォーマンス
- APIキー使用状況
- エラーログ

## バックアップとリカバリ

### 1. データベース
- Supabaseの自動バックアップ機能を使用
- 定期的な手動エクスポート

### 2. 設定ファイル
```bash
# 重要な設定をバックアップ
cp .env.local .env.local.backup
cp vercel.json vercel.json.backup
```

---

最終更新: 2024年
作成者: XBRL API開発チーム
