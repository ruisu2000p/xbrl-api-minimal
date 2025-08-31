# 🚨 緊急修正ガイド - Invalid API Key エラー

## 現在の問題
```
Supabase auth error: AuthApiError: Invalid API key
Status: 401
```

## 即座に必要なアクション

### ステップ1: 環境変数の状態確認

以下のURLにアクセスして、現在の環境変数の状態を確認してください：

```
https://xbrl-api-minimal.vercel.app/api/env-check?debug=xbrl2025debug
```

このエンドポイントは以下を確認します：
- 環境変数が設定されているか
- 正しいタイプのキーが設定されているか
- Supabaseへの接続が可能か

### ステップ2: Supabaseからキーを取得

1. **Supabaseダッシュボードにログイン**
   https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx

2. **左メニューから「Settings」をクリック**

3. **「API」セクションを選択**

4. **以下の2つのキーをコピー**：

   a. **anon public** (公開キー)
      - 「Reveal」をクリックして表示
      - 全体をコピー
      - これが `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   b. **service_role (secret)** (秘密キー) ⚠️重要
      - 「Reveal」をクリックして表示
      - 全体をコピー
      - これが `SUPABASE_SERVICE_ROLE_KEY`
      - **絶対に公開しないこと！**

### ステップ3: Vercelに環境変数を設定

1. **Vercelダッシュボードにログイン**
   https://vercel.com/dashboard

2. **プロジェクト `xbrl-api-minimal` を選択**

3. **「Settings」タブをクリック**

4. **左メニューから「Environment Variables」を選択**

5. **以下の環境変数を追加/更新**：

   | Key | Value | Environment |
   |-----|-------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://wpwqxhyiglbtlaimrjrx.supabase.co` | All (Production, Preview, Development) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [Supabaseからコピーしたanon public key] | All |
   | `SUPABASE_SERVICE_ROLE_KEY` | [Supabaseからコピーしたservice_role key] | All |

6. **各変数を追加後、「Save」をクリック**

### ステップ4: 再デプロイ

環境変数を設定した後、必ず再デプロイが必要です：

#### 方法A: Vercelダッシュボードから
1. Vercelプロジェクトページで「Deployments」タブを開く
2. 最新のデプロイメントの「...」メニューをクリック
3. 「Redeploy」を選択
4. 「Use existing Build Cache」のチェックを**外す**
5. 「Redeploy」をクリック

#### 方法B: GitHubから（推奨）
```bash
git add .
git commit -m "fix: Add Supabase environment variables"
git push origin main
```

### ステップ5: 動作確認

1. **環境変数チェック**（再デプロイ後）
   ```
   https://xbrl-api-minimal.vercel.app/api/env-check?debug=xbrl2025debug
   ```
   
   すべてが「OK」になっていることを確認

2. **ユーザー登録テスト**
   ```
   https://xbrl-api-minimal.vercel.app/register
   ```

## よくある間違い

### ❌ 間違い1: anon keyをservice_role keyとして設定
- anon keyとservice_role keyは**異なります**
- service_role keyの方が長く、より多くの権限を持ちます

### ❌ 間違い2: キーの一部だけをコピー
- キー全体をコピーする必要があります（通常200文字以上）

### ❌ 間違い3: 環境変数名のタイポ
- 正確に以下の名前を使用:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### ❌ 間違い4: 再デプロイを忘れる
- 環境変数の変更後は**必ず再デプロイが必要**

## それでも動作しない場合

1. **Vercelのビルドログを確認**
   - Vercel Dashboard > プロジェクト > Functions タブ
   - エラーログを確認

2. **Supabaseプロジェクトの状態確認**
   - Supabase Dashboard > Home
   - プロジェクトがActiveであることを確認

3. **ブラウザの開発者ツール**
   - Console タブでJavaScriptエラーを確認
   - Network タブでAPIリクエストの詳細を確認

## サポート情報

- **プロジェクトURL**: https://wpwqxhyiglbtlaimrjrx.supabase.co
- **Vercelプロジェクト**: xbrl-api-minimal
- **最終更新**: 2025年8月31日

---

⚠️ **セキュリティ注意**: `SUPABASE_SERVICE_ROLE_KEY`は極めて重要な秘密キーです。GitHub、ブログ、SNSなどに絶対に公開しないでください。