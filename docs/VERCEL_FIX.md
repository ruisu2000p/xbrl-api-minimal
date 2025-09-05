# Vercel Deployment Fix Guide

## 問題
Vercelが古いコミット（cd7da67）を使い続けており、最新コミット（c2fc16a）をデプロイしない。

## 解決手順

### 1. Vercel環境変数の設定
Settings → Environment Variablesで以下を追加：

```
NEXT_PUBLIC_SUPABASE_URL = https://zxzyidqrvzfzhicfuhlo.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmemhpY2Z1aGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE1NjIyMiwiZXhwIjoyMDcwNzMyMjIyfQ.I48BfRK6_YgAMF0LR9PmhzvFgqwu8fZDp-hz7ZVTvns
```

### 2. Git統合のリセット

1. Settings → Git → Disconnect from Git
2. 再度GitHubと接続
3. リポジトリ: ruisu2000p/xbrl-api-minimal を選択
4. Production Branch: main を設定

### 3. 手動デプロイ

1. Deployments タブを開く
2. 右上の ... メニューから "Redeploy" を選択
3. "Use different commit" を選択
4. コミットハッシュ: c2fc16a を入力
5. "Create Deployment" をクリック

### 4. 確認コマンド

デプロイ後、以下のコマンドで確認：

```bash
node test-final-api.js
```

成功時の期待値：
- 総企業数: 4,225社
- データソース: database
- S100企業が検索で見つかる

## 最新コミット情報
- c2fc16a: fix: Add production environment variables
- 13ad79f: chore: Force redeploy with latest code  
- 5763cc5: debug: Add comprehensive debug info to all responses