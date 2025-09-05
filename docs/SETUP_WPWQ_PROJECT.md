# wpwqxhyiglbtlaimrjrx Supabaseプロジェクトのセットアップ

## 現在の状況

wpwqxhyiglbtlaimrjrxプロジェクトが最新のプロジェクトとして使用されますが、以下の設定が必要です：

## 1. 正しいAPIキーの取得

Supabaseダッシュボードから正しいキーを取得してください：

1. [Supabase Dashboard](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/settings/api)にアクセス
2. Project API keysセクションから以下をコピー：
   - `anon` public key
   - `service_role` key (secret)

## 2. 環境変数ファイルの更新

`.env.wpwqxhyiglbtlaimrjrx`ファイルを以下の形式で更新：

```env
NEXT_PUBLIC_SUPABASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ダッシュボードからコピーしたanon key]
SUPABASE_SERVICE_ROLE_KEY=[ダッシュボードからコピーしたservice_role key]
```

## 3. データのインポート

環境変数を設定後、以下のコマンドでCSVデータをインポート：

```bash
cd xbrl-api-minimal-repo
node scripts/import-csv-to-supabase.js
```

これにより36,724件の企業データがインポートされます。

## 4. Vercel環境変数の更新

Vercel Dashboardで環境変数を更新：

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクト設定 → Environment Variables
3. 以下を更新：
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://wpwqxhyiglbtlaimrjrx.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: [正しいキー]
   - `SUPABASE_SERVICE_ROLE_KEY`: [正しいキー]

## 5. 検索機能のテスト

```bash
# ローカルテスト
node scripts/test-wpwq-search.js

# API経由のテスト
curl -s "https://xbrl-api-minimal.vercel.app/api/v1/companies?query=クスリ&limit=5" \
  -H "X-API-Key: xbrl_live_mMOXQ3bLDbuzHLaFjXN7bvYnRnf1k8qxu"
```

## インポートされるデータ

CSVファイル（2025-09-01T11-24_export.csv）から以下のデータがインポートされます：
- 企業名（株式会社クスリのアオキ、株式会社クスリのアオキホールディングス等）
- 書類名
- 提出日
- EDINETコード（docID）

## トラブルシューティング

### Invalid API keyエラー
- Supabaseダッシュボードから正しいキーをコピーしているか確認
- キーの前後に余分なスペースがないか確認
- Service Roleキーが必要な操作にはAnon keyではなくService Roleキーを使用

### テーブルが存在しない
- Supabaseダッシュボードでcompaniesテーブルを作成
- 必要なカラム: id, name, description, created_at, updated_at