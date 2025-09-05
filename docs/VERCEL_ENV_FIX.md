# 🚨 緊急: Vercel環境変数の修正

## 問題
現在、Vercel上のAPIが間違ったSupabaseプロジェクトを参照しているため、検索機能が動作していません。

## 正しい環境変数

Vercel Dashboardで以下の環境変数を**更新**してください：

### 1. NEXT_PUBLIC_SUPABASE_URL
```
https://zxzyidqrvzfzhicfuhlo.supabase.co
```
（現在の間違った値: https://wpwqxhyiglbtlaimrjrx.supabase.co）

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmemhpY2Z1aGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTYyMjIsImV4cCI6MjA3MDczMjIyMn0.McK1Ilx6wotT2c66qkPig9HUyPm6LKrt0HQnOwkGKIw
```

### 3. SUPABASE_SERVICE_ROLE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmemhpY2Z1aGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE1NjIyMiwiZXhwIjoyMDcwNzMyMjIyfQ.I48BfRK6_YgAMF0LR9PmhzvFgqwu8fZDp-hz7ZVTvns
```

## 更新手順

1. Vercel Dashboardにログイン
   https://vercel.com/dashboard

2. プロジェクト `xbrl-api-minimal` を選択

3. Settings → Environment Variables

4. 既存の変数を削除または更新：
   - 各変数の右側の「...」メニューから「Edit」を選択
   - 上記の正しい値に更新
   - 「Save」をクリック

5. 全環境に適用：
   - ✅ Production
   - ✅ Preview
   - ✅ Development

6. 再デプロイをトリガー：
   - Deployments タブに移動
   - 最新のデプロイメントの「...」メニューから「Redeploy」を選択

## 確認方法

更新後、以下のコマンドで確認：

```bash
# 検索機能のテスト
curl -s "https://xbrl-api-minimal.vercel.app/api/v1/companies?query=クスリ&limit=5" \
  -H "X-API-Key: xbrl_live_mMOXQ3bLDbuzHLaFjXN7bvYnRnf1k8qxu"
```

期待される結果：
- 「株式会社クスリのアオキ」と「株式会社クスリのアオキホールディングス」が返される

## データベース情報

正しいSupabaseプロジェクト（zxzyidqrvzfzhicfuhlo）には：
- 39,119社の企業データ
- 「クスリのアオキ」関連企業7件が存在

## トラブルシューティング

もし再デプロイ後も動作しない場合：
1. ブラウザのキャッシュをクリア
2. Vercelのファンクションログを確認
3. 環境変数が正しく反映されているか再確認

## ローカルテスト

ローカルで動作確認する場合：
```bash
cd xbrl-api-minimal-repo
node scripts/test-supabase-search.js
```

このスクリプトは正しいSupabaseに接続して、検索機能をテストします。