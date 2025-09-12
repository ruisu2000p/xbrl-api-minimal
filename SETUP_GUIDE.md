# 📋 XBRL API 完全セットアップガイド

## 🎯 このガイドについて
初めての方でも迷わずセットアップできるよう、スクリーンショット付きで解説します。

---

## 📝 事前準備チェックリスト

- [ ] メールアドレス（Supabase登録用）
- [ ] GitHubアカウント（なければ作成: https://github.com/signup）
- [ ] Node.js インストール済み（確認: `node -v`）
- [ ] 約30分の作業時間

---

## 🚀 STEP 1: Supabaseアカウント作成とプロジェクト設定

### 1-1. Supabaseアカウント作成

1. **https://supabase.com** にアクセス
2. 右上の「Start your project」をクリック
3. GitHubアカウントでサインイン（推奨）または メールで登録

### 1-2. 新規プロジェクト作成

1. ダッシュボードで「New project」をクリック
2. 以下を入力:
   ```
   Project name: xbrl-api-project
   Database Password: （自動生成をクリック → コピーして保存）
   Region: Northeast Asia (Tokyo)
   Plan: Free（無料）
   ```
3. 「Create new project」をクリック
4. プロジェクト作成完了まで約2分待つ

### 1-3. データベーステーブル作成

1. 左メニューから「SQL Editor」をクリック
2. 「New query」をクリック
3. 以下の手順でSQLを実行:
   - このプロジェクトの `sql/master-setup.sql` ファイルを開く
   - 全内容をコピー（Ctrl+A → Ctrl+C）
   - SQL Editorに貼り付け（Ctrl+V）
   - 右下の「Run」をクリック
4. 「Success」メッセージを確認

---

## 🔑 STEP 2: 環境変数の取得

### 2-1. Supabase API情報取得

1. Supabaseダッシュボードで左メニューの「Settings」をクリック
2. 「API」タブをクリック
3. 以下の3つをメモ帳にコピー:

#### A. Project URL
```
例: https://wpwqxhyiglbtlaimrjrx.supabase.co
これが → NEXT_PUBLIC_SUPABASE_URL
```

#### B. anon public（公開用キー）
```
例: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（長い文字列）
これが → NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### C. service_role（サーバー用キー）⚠️ 秘密情報
```
例: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（長い文字列）
これが → SUPABASE_SERVICE_ROLE_KEY
```

**⚠️ 重要**: service_roleキーは絶対に公開しないでください

### 2-2. 認証設定

1. 左メニューの「Authentication」をクリック
2. 「Providers」タブをクリック
3. 「Email」の設定:
   - Toggle をONにする
   - 「Confirm email」をON（推奨）
   - 「Save」をクリック

---

## 💻 STEP 3: ローカル環境セットアップ

### 3-1. プロジェクトのセットアップ

```bash
# 1. プロジェクトフォルダに移動
cd C:\Users\pumpk\Downloads\xbrl-api-minimal-main\xbrl-api-minimal-main

# 2. 環境変数ファイルを作成
copy .env.local.example .env.local
```

### 3-2. 環境変数の設定

1. `.env.local` ファイルをメモ帳で開く
2. 以下の値を設定:

```env
# ↓ STEP 2-1 でコピーした値を貼り付け
NEXT_PUBLIC_SUPABASE_URL=https://あなたのプロジェクトID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...から始まる長い文字列
SUPABASE_SERVICE_ROLE_KEY=eyJ...から始まる長い文字列

# ↓ これはそのままでOK
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3-3. 依存パッケージのインストール

```bash
# プロジェクトフォルダで実行
npm install
```

---

## ✅ STEP 4: 動作確認

### 4-1. 開発サーバー起動

```bash
npm run dev
```

### 4-2. ブラウザで確認

1. **http://localhost:3000** を開く
2. トップページが表示されることを確認

### 4-3. 会員登録テスト

1. 「無料で始める」をクリック
2. テスト用メールアドレスとパスワードを入力
   ```
   メール: test@example.com
   パスワード: Test1234!
   ```
3. 「アカウント作成」をクリック
4. メール確認ページが表示されればOK

---

## 🌐 STEP 5: Vercelへのデプロイ（オプション）

### 5-1. Vercelアカウント作成

1. **https://vercel.com/signup** にアクセス
2. GitHubでサインイン

### 5-2. プロジェクトインポート

1. Vercelダッシュボードで「Import Project」
2. GitHubリポジトリを選択
3. 環境変数を設定:
   - 「Environment Variables」セクションで追加
   - `.env.local` と同じ値を入力
4. 「Deploy」をクリック

---

## ❓ トラブルシューティング

### エラー: "Missing Supabase environment variables"
**解決策**: `.env.local` ファイルが正しく設定されているか確認

### エラー: "Failed to fetch companies"
**解決策**: 
1. Supabaseダッシュボードで「Table Editor」を開く
2. `companies` テーブルが存在するか確認
3. なければ `master-setup.sql` を再実行

### メールが届かない
**解決策**: 
1. 迷惑メールフォルダを確認
2. Supabaseの無料プランでは1時間に3通まで

---

## 📞 サポート

問題が解決しない場合:

1. エラーメッセージをコピー
2. 以下の情報と一緒に報告:
   - 実行したステップ
   - エラーが出た画面のスクリーンショット
   - Node.jsバージョン（`node -v`）

---

## ✨ セットアップ完了後の次のステップ

1. **APIキーを発行**
   - ダッシュボード → APIキー管理 → 新規作成

2. **APIをテスト**
   ```bash
   curl http://localhost:3000/api/v1/companies \
     -H "X-API-Key: 発行したAPIキー"
   ```

3. **本番環境へ**
   - Vercelにデプロイ
   - カスタムドメイン設定
   - 決済システム導入

---

## 📚 関連ドキュメント

- [API仕様書](./docs/API.md)
- [デプロイメントガイド](./DEPLOYMENT.md)
- [Supabase公式ドキュメント](https://supabase.com/docs)