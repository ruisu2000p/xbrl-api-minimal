# Vercel自動デプロイ設定ガイド

## 概要
このガイドでは、GitHub ActionsからVercelへの自動デプロイを設定する手順を説明します。

## 必要な設定

### 1. Vercel Token の取得

1. [Vercel Dashboard](https://vercel.com/account/tokens) にアクセス
2. "Create" をクリックして新しいトークンを作成
3. トークン名: `github-actions-deploy`
4. スコープ: Full Access
5. トークンをコピー（一度しか表示されません）

### 2. Vercel Project ID と Org ID の取得

```bash
# Vercel CLIをインストール
npm i -g vercel

# プロジェクトディレクトリで実行
vercel link

# 設定ファイルから情報を取得
cat .vercel/project.json
```

以下の情報が表示されます：
```json
{
  "projectId": "prj_xxxxxxxxxxxxx",
  "orgId": "team_xxxxxxxxxxxxx"
}
```

### 3. GitHub Secretsの設定

GitHubリポジトリの Settings > Secrets and variables > Actions に移動して、以下のシークレットを追加：

| Secret Name | Value | 説明 |
|------------|-------|------|
| `VERCEL_TOKEN` | `xxxxxxxxx` | Vercelアクセストークン |
| `VERCEL_ORG_ID` | `team_xxxxx` | Vercel組織ID |
| `VERCEL_PROJECT_ID` | `prj_xxxxx` | VercelプロジェクトID |

### 4. Vercelプロジェクト設定

#### 環境変数の設定

Vercel Dashboard > Project Settings > Environment Variables で以下を設定：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
API_KEY_SECRET=your-api-key-secret-minimum-32-chars

# Application
NEXT_PUBLIC_APP_URL=https://xbrl-api-minimal.vercel.app
NODE_ENV=production
```

#### ビルド設定

- Framework Preset: `Next.js`
- Build Command: `npm run build` または `next build`
- Output Directory: `.next`
- Install Command: `npm ci`

#### ドメイン設定

1. Settings > Domains
2. カスタムドメインを追加（オプション）
3. SSL証明書は自動で設定されます

## ワークフローの説明

### 本番デプロイ（main ブランチ）

`vercel-deploy.yml` が以下を実行：
1. mainブランチへのプッシュをトリガー
2. Vercel CLIで本番環境にデプロイ
3. デプロイURLをコミットにコメント

### プレビューデプロイ（PR）

`vercel-preview.yml` が以下を実行：
1. PRの作成/更新をトリガー
2. プレビュー環境にデプロイ
3. PRにプレビューURLをコメント

## デプロイの確認

### 1. GitHub Actions

- Actions タブでワークフローの実行状況を確認
- 各ステップのログを確認

### 2. Vercel Dashboard

- [Vercel Dashboard](https://vercel.com/dashboard) でデプロイ履歴を確認
- Functions タブでサーバーレス関数のログを確認

### 3. デプロイURL

- 本番: `https://xbrl-api-minimal.vercel.app`
- プレビュー: `https://xbrl-api-minimal-<branch>-<team>.vercel.app`

## トラブルシューティング

### デプロイが失敗する場合

1. **ビルドエラー**
   - `npm run build` がローカルで成功するか確認
   - Node.jsバージョンが一致しているか確認

2. **環境変数エラー**
   - Vercelダッシュボードで環境変数が設定されているか確認
   - 本番/プレビューで異なる値が必要な場合は環境ごとに設定

3. **権限エラー**
   - VERCEL_TOKENが有効か確認
   - プロジェクトへのアクセス権限があるか確認

### ロールバック

問題が発生した場合：
1. Vercel Dashboard > Deployments
2. 以前の安定版デプロイを選択
3. "Promote to Production" をクリック

## セキュリティベストプラクティス

1. **トークン管理**
   - トークンは定期的に更新
   - 最小権限の原則を適用

2. **環境変数**
   - 機密情報は必ずVercel環境変数で管理
   - `.env.local` はGitにコミットしない

3. **ブランチ保護**
   - mainブランチは保護ルールを設定
   - PRレビューを必須化

## 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [GitHub Actions with Vercel](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel)