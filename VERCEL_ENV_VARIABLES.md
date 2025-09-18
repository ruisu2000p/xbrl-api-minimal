# Vercel環境変数設定ガイド

以下の環境変数をVercelプロジェクトに設定してください：

## 必須環境変数

### 1. KEY_DERIVE_SECRET
APIキーのハッシュ化に使用される秘密鍵
```
KEY_DERIVE_SECRET=19d1c60d6abc3ee7699476b8b8474c447684638f509372ab9ee5f23c98f0f654
```

### 2. SUPABASE_SERVICE_ROLE_KEY
Supabaseのサービスロールキー（Supabaseダッシュボードから取得）
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU2NDU0OCwiZXhwIjoyMDcyMTQwNTQ4fQ.z9gZrHoEJRvQJGzxbiKzXJzUUGnFEfIJdGSqSZBvS2E
```

### 3. NEXT_PUBLIC_SUPABASE_URL
Supabaseプロジェクトの公開URL
```
NEXT_PUBLIC_SUPABASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co
```

### 4. NEXT_PUBLIC_SUPABASE_ANON_KEY
Supabaseの公開用アノンキー
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.rQZKk5V8qmiDhIHRy5YMlYt4l9ccVlX96xNLZV7iTHs
```

## 設定方法

1. [Vercel Dashboard](https://vercel.com/aas-projects-49d0d7ef/xbrl-api-minimal/settings/environment-variables) にアクセス
2. 各環境変数を以下の設定で追加：
   - Environment: Production, Preview, Development（すべてにチェック）
   - Sensitive: KEY_DERIVE_SECRET と SUPABASE_SERVICE_ROLE_KEY はチェック
3. 「Save」をクリック
4. プロジェクトを再デプロイ

## 注意事項

- **KEY_DERIVE_SECRET**: この値は秘密にしてください。絶対に公開しないでください。
- **SUPABASE_SERVICE_ROLE_KEY**: サービスロールキーはバックエンドのみで使用。フロントエンドで使用しないでください。
- 環境変数追加後は必ず再デプロイが必要です。

## テスト方法

環境変数設定後、以下をテスト：
1. 会員登録機能
2. APIキー生成
3. APIエンドポイントへのアクセス