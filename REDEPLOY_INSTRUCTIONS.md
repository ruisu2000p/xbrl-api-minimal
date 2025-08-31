# 🚀 Functions 再デプロイ手順

## 両方の関数を最新版で再デプロイしてください

### 1. keys_issue 関数の更新

1. [Functions Dashboard](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/functions) を開く
2. `keys_issue` 関数をクリック
3. 「Edit Function」または「View Source」をクリック
4. 現在のコードを全て削除
5. 以下のファイルの内容を全てコピー＆ペースト：
   ```
   C:\Users\pumpk\xbrl-api-minimal\supabase\functions\keys_issue\index_fixed.ts
   ```
6. 「Deploy」をクリック

### 2. v1_filings 関数の更新

1. 同じく Functions Dashboard で `v1_filings` 関数をクリック
2. 「Edit Function」または「View Source」をクリック
3. 現在のコードを全て削除
4. 以下のファイルの内容を全てコピー＆ペースト：
   ```
   C:\Users\pumpk\xbrl-api-minimal\supabase\functions\v1_filings\index_fixed.ts
   ```
5. 「Deploy」をクリック

## ⚠️ 重要な確認事項

### 環境変数の確認
[Project Settings → Configuration → Edge Functions](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/settings/functions) で以下を確認：

- `SUPABASE_URL` - 自動設定されているはず
- `SUPABASE_SERVICE_ROLE_KEY` - 自動設定されているはず
- `SUPABASE_ANON_KEY` - 自動設定されているはず

もし設定されていない場合：
1. [API Settings](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/settings/api) から取得
2. Edge Functions の環境変数に追加

## 📝 デプロイ後の確認

デプロイが完了したら、以下を実行してテスト：

```bash
cd C:\Users\pumpk\xbrl-api-minimal
node test-api-direct.js
```

## 🔍 エラーが続く場合

1. Functions のログを確認
2. エラーメッセージをコピー
3. 具体的なエラー内容を教えてください

## 💡 ヒント

もし「Missing authorization header」というエラーが出る場合、古いバージョンがデプロイされています。
最新版では以下のようなエラーメッセージになるはずです：
- keys_issue: "Missing or invalid authorization header"
- v1_filings: "x-api-key required"