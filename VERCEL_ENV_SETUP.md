# Vercel環境変数設定ガイド

## 🚨 重要: ユーザー登録エラーの解決方法

現在、`Invalid API key`エラーが発生しています。これは**Supabase環境変数がVercelに設定されていない**ことが原因です。

## 必要な環境変数

Vercel Dashboardで以下の環境変数を設定してください：

### 1. NEXT_PUBLIC_SUPABASE_URL
```
https://wpwqxhyiglbtlaimrjrx.supabase.co
```

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Supabaseダッシュボードから取得してください
```
取得場所: [Supabase Dashboard](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/settings/api) > Project API keys > anon public

### 3. SUPABASE_SERVICE_ROLE_KEY ⚠️ 秘密キー
```
Supabaseダッシュボードから取得してください（絶対に公開しないこと）
```
取得場所: [Supabase Dashboard](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/settings/api) > Project API keys > service_role (secret)

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