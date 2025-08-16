# Vercel環境変数設定ガイド

## 必要な環境変数

Vercel Dashboardで以下の環境変数を設定してください：

### 1. NEXT_PUBLIC_SUPABASE_URL
```
https://zxzyidqrvzfzhicfuhlo.supabase.co
```

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmeGhpY2Z1aGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNDU2MDAsImV4cCI6MjA0OTkyMTYwMH0.YOUR_ACTUAL_KEY_HERE
```
（実際の値は .env.local ファイルから取得）

### 3. SUPABASE_SERVICE_ROLE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmeGhpY2Z1aGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDM0NTYwMCwiZXhwIjoyMDQ5OTIxNjAwfQ.YOUR_ACTUAL_KEY_HERE
```
（実際の値は .env.local ファイルから取得）

## 設定手順

1. Vercel Dashboardにログイン
   https://vercel.com/dashboard

2. プロジェクト `xbrl-api-minimal` を選択

3. Settings タブをクリック

4. 左メニューから「Environment Variables」を選択

5. 各環境変数を追加：
   - Key: 環境変数名
   - Value: 上記の値（.env.localから正確にコピー）
   - Environment: ✅ Production, ✅ Preview, ✅ Development

6. 「Save」をクリック

7. デプロイをトリガー（自動的に再デプロイされます）

## 確認方法

設定後、以下のコマンドで確認：

```bash
curl -X POST https://xbrl-api-minimal.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pumpkin8000@gmail.com","password":"Password8000!"}'
```

## ログイン情報

| メールアドレス | パスワード |
|---------------|-----------|
| pumpkin8000@gmail.com | Password8000! |
| pumpkin3020@gmail.com | Password3020! |

## トラブルシューティング

1. 環境変数が正しく設定されているか確認
2. Vercelで再デプロイを実行
3. ブラウザのキャッシュをクリア
4. プライベートブラウジングモードで試す