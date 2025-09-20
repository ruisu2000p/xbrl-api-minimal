# Vercel デプロイメント設定ガイド

## 必要なGitHub Secrets

以下のシークレットをGitHubリポジトリに設定する必要があります：

### 1. VERCEL_TOKEN
Vercelアカウントのアクセストークン
- [Vercel Dashboard](https://vercel.com/account/tokens) で作成
- "Create Token" をクリックして新しいトークンを生成
- トークンをコピー

### 2. VERCEL_ORG_ID
VercelのOrganization ID
```bash
# ローカルで以下のコマンドを実行
npx vercel link
# .vercel/project.json の "orgId" の値
```

### 3. VERCEL_PROJECT_ID
VercelのProject ID
```bash
# ローカルで以下のコマンドを実行
npx vercel link
# .vercel/project.json の "projectId" の値
```

## GitHub Secretsの設定方法

1. GitHubリポジトリページを開く
2. Settings タブをクリック
3. 左サイドバーの "Secrets and variables" → "Actions" を選択
4. "New repository secret" をクリック
5. 以下のシークレットを追加：
   - Name: `VERCEL_TOKEN`
   - Secret: (Vercelから取得したトークン)
   - Name: `VERCEL_ORG_ID`
   - Secret: (orgIdの値)
   - Name: `VERCEL_PROJECT_ID`
   - Secret: (projectIdの値)

## ローカルでの確認方法

```bash
# Vercel CLIをインストール
npm i -g vercel

# Vercelにログイン
vercel login

# プロジェクトをリンク
vercel link

# .vercel/project.json を確認
cat .vercel/project.json
```

## トラブルシューティング

### エラー: No existing credentials found
- `VERCEL_TOKEN`が正しく設定されていない
- トークンの有効期限が切れている
- GitHubのシークレット名が正確でない（大文字小文字の区別あり）

### エラー: Invalid project ID
- `VERCEL_PROJECT_ID`が正しくない
- プロジェクトが存在しない、または権限がない

## セキュリティ注意事項

- トークンは絶対にコードにハードコーディングしない
- `.vercel`ディレクトリは`.gitignore`に追加済み
- トークンは定期的に更新することを推奨

## 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions with Vercel](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel)