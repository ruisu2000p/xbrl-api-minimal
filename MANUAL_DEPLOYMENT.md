# 📋 手動デプロイメント手順

## Supabase Functionsの手動デプロイ

データベースパスワードが必要なため、Supabase Dashboardから直接デプロイします。

### 方法1: Supabase Dashboard から手動デプロイ（推奨）

1. **[Functions Dashboard](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/functions)を開く**

2. **keys_issue関数を作成/更新**:
   - 「New Function」または既存の`keys_issue`を選択
   - 以下のファイルの内容をコピー＆ペースト：
     ```
     C:\Users\pumpk\xbrl-api-minimal\supabase\functions\keys_issue\index.ts
     ```

3. **v1_filings関数を作成/更新**:
   - 「New Function」または既存の`v1_filings`を選択
   - 以下のファイルの内容をコピー＆ペースト：
     ```
     C:\Users\pumpk\xbrl-api-minimal\supabase\functions\v1_filings\index.ts
     ```

4. **共有ユーティリティの確認**:
   - 各関数で`_shared/utils.ts`をインポートしている場合
   - 以下のファイルの内容も含める必要があります：
     ```
     C:\Users\pumpk\xbrl-api-minimal\supabase\functions\_shared\utils.ts
     ```

### 方法2: Supabase CLIでのデプロイ（パスワード必要）

1. **データベースパスワードを取得**:
   - [Database Settings](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/settings/database)
   - パスワードをリセットして新しいパスワードを設定

2. **プロジェクトをリンク**:
   ```bash
   cd C:\Users\pumpk\xbrl-api-minimal
   npx supabase@latest link --project-ref wpwqxhyiglbtlaimrjrx
   # パスワードを入力
   ```

3. **Functionsをデプロイ**:
   ```bash
   npx supabase@latest functions deploy keys_issue
   npx supabase@latest functions deploy v1_filings
   ```

## 🧪 動作テスト

### HTMLテストページ
```bash
cd C:\Users\pumpk\xbrl-api-minimal
start test-api-frontend.html
```

### Node.jsテストスクリプト
```bash
node test-api-direct.js
```

### cURLテスト
```bash
# 1. ユーザー登録
curl -X POST https://wpwqxhyiglbtlaimrjrx.supabase.co/auth/v1/signup \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# 2. サインイン（access_token取得）
curl -X POST https://wpwqxhyiglbtlaimrjrx.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# 3. APIキー発行（access_tokenを使用）
curl -X POST https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/keys_issue \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 4. API使用
curl https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/v1_filings?limit=5 \
  -H "x-api-key: YOUR_API_KEY"
```

## ✅ チェックリスト

- [x] SQLテーブル作成完了
- [x] RLSポリシー設定完了
- [x] incr_usage_and_get関数作成完了
- [ ] keys_issue関数デプロイ
- [ ] v1_filings関数デプロイ
- [ ] APIキー発行テスト
- [ ] データアクセステスト

## 🔗 重要なリンク

- [Functions Dashboard](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/functions)
- [SQL Editor](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/sql)
- [Auth Settings](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/auth/email-templates)
- [Database Settings](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/settings/database)