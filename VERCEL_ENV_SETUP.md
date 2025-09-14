# Vercel環境変数の設定

以下の環境変数をVercelプロジェクトに設定してください：

## 必須の環境変数

1. **API_KEY_SECRET** (必須)
   ```
   9e6c6ae2ee68cb67dae8a6d33cdb44fc64da3c211a56c17417fbf2c72ce66a6e
   ```
   - 説明: APIキーのHMAC署名用シークレット（最低32文字）

2. **NEXT_PUBLIC_SUPABASE_URL** (必須)
   ```
   https://wpwqxhyiglbtlaimrjrx.supabase.co
   ```
   - 説明: SupabaseプロジェクトのURL

3. **NEXT_PUBLIC_SUPABASE_ANON_KEY** (必須)
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU
   ```
   - 説明: Supabase匿名キー

4. **SUPABASE_SERVICE_ROLE_KEY** (必須)
   - Supabaseダッシュボード → Settings → API → Service role keyから取得
   - URL: https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/settings/api
   - 説明: Supabaseサービスロールキー（秘密鍵）

## 設定方法

1. Vercelダッシュボードにアクセス: https://vercel.com/aas-projects-49d0d7ef/xbrl-api-minimal
2. "Settings" タブをクリック
3. "Environment Variables" セクションに移動
4. 上記の環境変数を追加
5. "Save" をクリック
6. 再デプロイをトリガー

## オプションの環境変数

- **RATE_LIMIT_WINDOW_MS**: レート制限ウィンドウ（ミリ秒）デフォルト: 60000
- **RATE_LIMIT_MAX_REQUESTS**: 最大リクエスト数 デフォルト: 100
- **NEXT_PUBLIC_APP_URL**: アプリケーションURL デフォルト: 自動検出