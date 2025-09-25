# Vercel環境変数設定ガイド

## 必要な環境変数

Vercelダッシュボードで以下の環境変数を設定してください：

### 1. Supabase関連（公開）
```
NEXT_PUBLIC_SUPABASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs
```

### 2. Supabase Service Key（機密）
```
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEYをここに設定]
XBRL_SUPABASE_SERVICE_KEY=[SERVICE_ROLE_KEYをここに設定]
```

### 3. セキュリティ関連（機密）
```
API_KEY_SECRET=[最低32文字のランダム文字列]
API_KEY_PEPPER=[Edge Function用のペッパー値]
```

### 4. アプリケーション設定
```
NEXT_PUBLIC_APP_URL=https://xbrl-api-minimal.vercel.app
NODE_ENV=production
```

## 設定手順

1. [Vercelダッシュボード](https://vercel.com/dashboard)にアクセス
2. プロジェクト「xbrl-api-minimal」を選択
3. Settings → Environment Variables に移動
4. 上記の変数を追加
   - `NEXT_PUBLIC_`で始まる変数は「公開」
   - その他は「機密」として設定

## 重要な注意事項

### Service Role Keyの取得
1. [Supabaseダッシュボード](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/settings/api)にアクセス
2. Project API keys → service_role をコピー
3. **絶対に公開しないこと**

### API_KEY_SECRETの生成
```bash
# Node.jsで生成する場合
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# または以下のようなランダム文字列を使用
# 例: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4
```

### API_KEY_PEPPERの設定
Edge Function用のペッパー値です。Supabaseダッシュボードで設定：
1. [Edge Functions設定](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/functions)
2. api-key-manager関数を選択
3. Secrets → API_KEY_PEPPERを追加

## デプロイ後の確認

1. 環境変数が正しく設定されているか確認
   ```
   https://xbrl-api-minimal.vercel.app/api/health
   ```

2. 認証フローのテスト
   - ログインページでアカウント作成
   - ダッシュボードへのアクセス確認
   - APIキー作成機能の動作確認

## トラブルシューティング

### 認証が機能しない場合
- 環境変数が正しく設定されているか確認
- Vercelのログでエラーを確認
- Supabaseのログでエラーを確認

### Cookieが保存されない場合
- ブラウザの開発者ツール → Application → Cookies で確認
- `sb-access-token`と`sb-refresh-token`が存在するか確認
- HTTPSでアクセスしているか確認（本番環境）

### APIキー作成に失敗する場合
- API_KEY_PEPPERがEdge Functionに設定されているか確認
- Supabase Edge Functionのログを確認