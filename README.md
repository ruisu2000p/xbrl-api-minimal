# XBRL API Minimal

XBRL財務データ分析プラットフォーム - Financial Information next (FIN)

## 環境設定

### 必要な環境変数

Vercelにデプロイする前に、以下の環境変数を設定してください：

1. **Vercelダッシュボード** → **Settings** → **Environment Variables**

```env
# Supabase設定（必須）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
XBRL_SUPABASE_SERVICE_KEY=your-service-role-key

# アプリケーションURL（本番環境用）
NEXT_PUBLIC_APP_URL=https://xbrl-api-minimal.vercel.app
```

### Supabase設定

1. **Supabaseダッシュボード** → **Authentication** → **URL Configuration**
   - Site URL: `https://xbrl-api-minimal.vercel.app`
   - Redirect URLs:
     - `https://xbrl-api-minimal.vercel.app/auth/callback`
     - `https://xbrl-api-minimal.vercel.app`

2. **Email Templates**
   - Confirm signup: リダイレクトURLを含むテンプレートに更新
   - Reset password: リダイレクトURLを含むテンプレートに更新

### ローカル開発

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.localを編集して実際の値を設定

# 開発サーバーの起動
npm run dev
```

### データベース構成

アプリケーションは以下のスキーマを使用します：

- `public`: 一般的なデータ（ユーザープロファイルなど）
- `private`: セキュアなデータ（APIキー、認証情報）
- `auth`: Supabase認証システム（自動管理）

### トラブルシューティング

#### セッションが維持されない場合

1. Supabaseの環境変数が正しく設定されているか確認
2. VercelのEnvironment Variablesに全ての必要な変数が設定されているか確認
3. Supabase Authentication URLsが正しく設定されているか確認

#### ビルドエラーが発生する場合

1. Node.jsバージョンが20.0.0以上であることを確認
2. 全ての依存関係が正しくインストールされているか確認
3. TypeScriptの型エラーがないか確認（`npm run type-check`）

## デプロイ

Vercelへのデプロイは自動的に行われます（mainブランチへのpush時）。

手動デプロイ：
```bash
vercel --prod
```

## ライセンス

MIT