# Supabase ローカル開発 & リモートデプロイメント ガイド

## 概要
このガイドではXBRL財務データAPIプロジェクトのSupabase開発環境構築とリモートデプロイメント方法を説明します。

## プロジェクト情報
- **プロジェクトID**: wpwqxhyiglbtlaimrjrx
- **プロジェクトURL**: https://wpwqxhyiglbtlaimrjrx.supabase.co
- **ダッシュボード**: https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx

## 前提条件
- Node.js 20以上
- npm 10以上
- Docker Desktop（ローカル開発用）
- Supabase CLI

## 1. ローカル開発環境のセットアップ

### 1.1 Docker Desktopの起動
```bash
# Windows: Docker Desktopを起動
# Mac/Linux: dockerデーモンが起動していることを確認
docker --version
```

### 1.2 Supabase CLIのインストール
```bash
npm install -D supabase@latest
```

### 1.3 ローカルSupabaseの起動
```bash
cd xbrl-api-minimal
npx supabase start
```

起動すると以下のサービスが利用可能になります：
- **API URL**: http://localhost:54321
- **GraphQL URL**: http://localhost:54321/graphql/v1
- **Database URL**: postgresql://postgres:postgres@localhost:54322/postgres
- **Studio URL**: http://localhost:54323
- **Inbucket URL**: http://localhost:54324 (メールテスト用)

### 1.4 環境変数の設定
`.env.local`ファイルを作成：
```env
# ローカル開発用
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... # supabase startで表示されるanon key
SUPABASE_SERVICE_ROLE_KEY=eyJ... # supabase startで表示されるservice_role key
```

## 2. データベースマイグレーション

### 2.1 マイグレーションファイルの作成
```bash
npx supabase migration new create_tables
```

### 2.2 マイグレーションの実行
```bash
# ローカル環境に適用
npx supabase db push

# リモート環境に適用
npx supabase db push --linked
```

## 3. リモート環境へのデプロイ

### 3.1 プロジェクトのリンク
```bash
npx supabase link --project-ref wpwqxhyiglbtlaimrjrx
```

### 3.2 環境変数の取得
```bash
# リモート環境のキーを取得
npx supabase secrets list
```

### 3.3 本番環境変数の設定
`.env.production`ファイル：
```env
NEXT_PUBLIC_SUPABASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<本番環境のanon key>
# Service Role Keyは環境変数で管理（Vercelの環境変数に設定）
```

### 3.4 データベースの同期
```bash
# ローカルからリモートへスキーマをプッシュ
npx supabase db push --linked

# リモートからローカルへスキーマをプル
npx supabase db pull
```

## 4. Edge Functions のデプロイ（必要な場合）

### 4.1 Edge Functionの作成
```bash
npx supabase functions new my-function
```

### 4.2 デプロイ
```bash
npx supabase functions deploy my-function --project-ref wpwqxhyiglbtlaimrjrx
```

## 5. ストレージバケットの設定

### 5.1 バケットの作成
```sql
-- Supabase SQLエディタで実行
INSERT INTO storage.buckets (id, name, public)
VALUES ('markdown-files', 'markdown-files', true);
```

### 5.2 RLSポリシーの設定
```sql
-- 読み取り権限（認証ユーザーまたは有効なAPIキー）
CREATE POLICY "Allow authenticated read access" ON storage.objects
FOR SELECT USING (
    bucket_id = 'markdown-files' AND
    (auth.role() = 'authenticated' OR
     EXISTS (
         SELECT 1 FROM api_keys
         WHERE status = 'active'
     ))
);
```

## 6. Vercelへのデプロイ

### 6.1 環境変数の設定
Vercelダッシュボードで以下を設定：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_KEY_SECRET`

### 6.2 デプロイコマンド
```bash
# Vercel CLIを使用
vercel --prod

# または Git push (自動デプロイ設定済みの場合)
git push origin main
```

## 7. ローカル開発のベストプラクティス

### 7.1 データのシード
```bash
# seedファイルを作成
npx supabase seed create initial-data

# seedを実行
npx supabase db seed
```

### 7.2 型の生成
```bash
# TypeScript型を生成
npx supabase gen types typescript --linked > types/supabase.ts
```

### 7.3 ローカル環境のリセット
```bash
# すべてをリセット
npx supabase db reset

# 停止
npx supabase stop
```

## 8. トラブルシューティング

### Docker Desktopが起動しない
- Windows: 管理者権限で実行
- WSL2の更新が必要な場合がある

### マイグレーションエラー
```bash
# 強制的にリセット
npx supabase db reset --linked
```

### 接続エラー
- ファイアウォール設定を確認
- ポート54321-54326が使用されていないか確認

## 9. セキュリティ考慮事項

- **Service Role Key**は絶対に公開しない
- Vercelの環境変数に保存
- `.env.local`はGitにコミットしない
- RLSを必ず有効にする

## 10. 継続的インテグレーション

### GitHub Actions設定例
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## まとめ
このガイドに従うことで、ローカル開発環境の構築からリモートへのデプロイまでスムーズに実行できます。定期的にローカルとリモートの同期を取りながら開発を進めてください。