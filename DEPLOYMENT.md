# 🚀 XBRL API デプロイメントガイド

## 目次
1. [必要な準備](#必要な準備)
2. [Supabase設定](#supabase設定)
3. [Vercelデプロイ](#vercelデプロイ)
4. [動作確認](#動作確認)
5. [トラブルシューティング](#トラブルシューティング)

---

## 必要な準備

### 必須アカウント
- [ ] [Supabase](https://supabase.com) アカウント
- [ ] [Vercel](https://vercel.com) アカウント
- [ ] [GitHub](https://github.com) アカウント

### オプション（推奨）
- [ ] [Resend](https://resend.com) または [SendGrid](https://sendgrid.com) アカウント（メール送信用）
- [ ] [Sentry](https://sentry.io) アカウント（エラー監視用）
- [ ] [Upstash](https://upstash.com) アカウント（レート制限用）

---

## Supabase設定

### 1. プロジェクト作成

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. 「New project」をクリック
3. 以下を入力:
   - Project name: `xbrl-api`
   - Database Password: 安全なパスワードを生成
   - Region: `Northeast Asia (Tokyo)` を選択
4. 「Create new project」をクリック

### 2. データベース設定

1. プロジェクトダッシュボードから「SQL Editor」を開く
2. `sql/master-setup.sql` の内容をコピー
3. SQLエディタに貼り付けて「Run」をクリック
4. 成功メッセージを確認

### 3. 認証設定

1. 「Authentication」 > 「Providers」を開く
2. 「Email」を有効化:
   - Enable Email provider: ON
   - Confirm email: ON（推奨）
   - Secure email change: ON
3. 「Auth」 > 「URL Configuration」で設定:
   ```
   Site URL: https://your-app.vercel.app
   Redirect URLs: 
   - https://your-app.vercel.app/auth/callback
   - http://localhost:3000/auth/callback（開発用）
   ```

### 4. APIキー取得

1. 「Settings」 > 「API」を開く
2. 以下をコピー:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## Vercelデプロイ

### 1. GitHubリポジトリ準備

```bash
# リポジトリ作成
git init
git add .
git commit -m "Initial commit"

# GitHubにプッシュ
git remote add origin https://github.com/YOUR_USERNAME/xbrl-api.git
git push -u origin main
```

### 2. Vercelでインポート

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. 「Import Project」をクリック
3. GitHubリポジトリを選択
4. 「Import」をクリック

### 3. 環境変数設定

Vercelのプロジェクト設定で以下を追加:

```env
# 必須
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app

# オプション（メール送信）
RESEND_API_KEY=re_xxxxxxxxxxxx
```

### 4. デプロイ

1. 「Deploy」をクリック
2. ビルドログを確認
3. デプロイ完了を待つ（約2-3分）

---

## 動作確認

### 基本機能テスト

1. **トップページ確認**
   ```
   https://your-app.vercel.app
   ```

2. **会員登録**
   - 「無料で始める」をクリック
   - メールアドレスとパスワードを入力
   - 確認メールをチェック

3. **ログイン**
   - `/auth/login` にアクセス
   - 登録したアカウントでログイン

4. **APIキー発行**
   - ダッシュボードから「新規APIキー作成」
   - APIキーをコピーして保存

5. **API動作確認**
   ```bash
   curl -X GET \
     'https://your-app.vercel.app/api/v1/companies?page=1&per_page=10' \
     -H 'X-API-Key: your_api_key_here'
   ```

### Supabaseデータ確認

1. Supabase Dashboard > 「Table Editor」
2. 以下のテーブルを確認:
   - `auth.users` - 登録ユーザー
   - `api_keys` - 発行されたAPIキー
   - `api_key_usage_logs` - API使用ログ

---

## トラブルシューティング

### よくある問題と解決策

#### 1. ビルドエラー

```bash
Error: Missing environment variables
```
**解決策**: Vercelの環境変数設定を確認

#### 2. 認証エラー

```
Error: Invalid API credentials
```
**解決策**: 
- Supabase URLとキーを再確認
- `NEXT_PUBLIC_` プレフィックスを確認

#### 3. データベースエラー

```
Error: relation "api_keys" does not exist
```
**解決策**: 
- `master-setup.sql` を再実行
- Supabaseプロジェクトを確認

#### 4. メール送信エラー

**解決策**:
- Resend/SendGrid APIキーを設定
- Supabase Auth設定でSMTP設定

#### 5. CORS エラー

**解決策**:
- `next.config.js` でCORS設定追加:
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ]
  },
}
```

---

## 本番運用チェックリスト

### セキュリティ
- [ ] 環境変数を本番用に設定
- [ ] レート制限を有効化
- [ ] CORS設定を制限
- [ ] SQLインジェクション対策確認

### パフォーマンス
- [ ] データベースインデックス作成
- [ ] キャッシュ戦略実装
- [ ] CDN設定（Vercel自動）

### 監視
- [ ] Sentry設定
- [ ] ログ収集設定
- [ ] アラート設定
- [ ] 使用状況モニタリング

### バックアップ
- [ ] データベースバックアップ設定
- [ ] 定期バックアップスケジュール

---

## サポート

問題が解決しない場合:

1. [Supabase Discord](https://discord.supabase.com)
2. [Vercel Discord](https://vercel.com/discord)
3. [GitHub Issues](https://github.com/YOUR_USERNAME/xbrl-api/issues)

---

## 関連ドキュメント

- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [API仕様書](./docs/API.md)