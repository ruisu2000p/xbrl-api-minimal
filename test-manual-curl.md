# 手動テスト用コマンド

## 1. まず、有効なアクセストークンを取得

最後のテストで生成されたアクセストークンを使用するか、以下で新規作成：

```bash
# PowerShell
$response = Invoke-RestMethod -Uri "https://wpwqxhyiglbtlaimrjrx.supabase.co/auth/v1/signup" `
  -Method POST `
  -Headers @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU"
    "Content-Type" = "application/json"
  } `
  -Body (@{
    email = "test_$(Get-Random)@test.com"
    password = "Test1234!"
  } | ConvertTo-Json)

$response.access_token
```

## 2. APIキー発行をテスト

最新のアクセストークンを使用：

```bash
# PowerShell
curl -Method POST `
  -Headers @{"Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6Ik1jRTg1dmNkbXRFRFhKdEUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3dwd3F4aHlpZ2xidGxhaW1yanJ4LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI0OWU2MTA1Yy01MTAxLTQ2ZWEtODc2Yy05OWMwZDExNzkyZDEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU2NjM5NTQ3LCJpYXQiOjE3NTY2MzU5NDcsImVtYWlsIjoidGVzdF94YWowOTNAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InRlc3RfeGFqMDkzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjQ5ZTYxMDVjLTUxMDEtNDZlYS04NzZjLTk5YzBkMTE3OTJkMSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU2NjM1OTQ3fV0sInNlc3Npb25faWQiOiJjYzJjNDU4Ny02MDliLTQxMDMtOTNjNy1hMjRiMmY3YjA0MjAiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.VHBbf07ceG8ja2xWx8ijLDMIElvLa2PiX0ZKMMljGW4"} `
  https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/keys_issue
```

## 3. もしAPIキーが取得できたら

```bash
# PowerShell
curl -Headers @{"x-api-key" = "YOUR_API_KEY_HERE"} `
  "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/v1_filings?limit=5"
```

## 📋 確認事項

1. **keys_issue のエラーログを確認**
   - https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/functions/keys_issue/logs
   - 500エラーの詳細を見る

2. **環境変数の確認**
   - https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/settings/functions
   - `SUPABASE_SERVICE_ROLE_KEY` が設定されているか

3. **データベースの確認**
   ```sql
   -- api_keys テーブルの構造を確認
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'api_keys'
   ORDER BY ordinal_position;
   ```