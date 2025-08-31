# Vercel デプロイメント設定ガイド

## 📋 完全統合システムの概要

このアプリケーションは以下の機能を提供します：

1. **ユーザー認証** - Supabase Authによる会員管理
2. **APIキー管理** - Supabase Edge Functionsによる発行・検証
3. **ダッシュボード** - APIキー管理、使用状況確認
4. **API検証** - リアルタイムでAPIキーの動作確認

## 🚀 Vercelデプロイ手順

### 1. 環境変数設定

Vercelダッシュボード > Settings > Environment Variables で以下を設定：

```bash
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]

# API設定
NEXT_PUBLIC_API_BASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1

# アプリ設定
NEXT_PUBLIC_APP_NAME=XBRL財務データAPI
NEXT_PUBLIC_APP_URL=https://xbrl-api-minimal.vercel.app
```

### 2. データベース準備

Supabase SQL Editorで以下を実行：

#### テーブル作成
```sql
-- api_keys テーブル
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_suffix TEXT,
  masked_key TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  rate_limit_per_minute INTEGER DEFAULT 100,
  rate_limit_per_hour INTEGER DEFAULT 10000,
  rate_limit_per_day INTEGER DEFAULT 100000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- api_usage テーブル
CREATE TABLE IF NOT EXISTS public.api_usage (
  key_id TEXT PRIMARY KEY,
  minute_window TIMESTAMP WITH TIME ZONE NOT NULL,
  hour_window TIMESTAMP WITH TIME ZONE NOT NULL,
  day_window TIMESTAMP WITH TIME ZONE NOT NULL,
  minute_count BIGINT DEFAULT 0,
  hour_count BIGINT DEFAULT 0,
  day_count BIGINT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix_hash ON public.api_keys(key_prefix, key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
```

### 3. Edge Functions設定

Supabase Dashboard > Functions で以下を設定：

#### keys_issue関数
- JWT Verification: **Disabled**
- 環境変数: `KEY_PEPPER=37s4DQwo0C0rtwxypynFpVgTq5Wvg/jMpX2o6qGHHK8=`

#### v1_filings関数
- JWT Verification: **Disabled**
- 環境変数: `KEY_PEPPER=37s4DQwo0C0rtwxypynFpVgTq5Wvg/jMpX2o6qGHHK8=`

### 4. デプロイ

```bash
# リポジトリをクローン
git clone https://github.com/ruisu2000p/xbrl-api-minimal.git
cd xbrl-api-minimal

# 依存関係インストール
npm install

# ビルドテスト
npm run build

# Vercelにデプロイ
vercel --prod
```

## 🔧 アプリケーション構成

### ページ構成

```
/                    - ランディングページ
/login              - ログインページ
/register           - 新規登録ページ
/dashboard          - APIキー管理ダッシュボード
/dashboard/usage    - API使用状況
/profile            - プロフィール設定
/docs               - APIドキュメント
```

### API構成

```
/api/auth/login     - ログイン処理
/api/auth/register  - 新規登録
/api/auth/logout    - ログアウト
/api/keys/list      - APIキー一覧取得
/api/keys/create    - APIキー作成
/api/keys/delete    - APIキー削除
/api/keys/test      - APIキーテスト
```

## 📊 機能一覧

### 1. ユーザー認証
- ✅ メール/パスワード認証
- ✅ パスワードリセット
- ✅ セッション管理
- ✅ プロフィール管理

### 2. APIキー管理
- ✅ APIキー発行（HMAC-SHA256）
- ✅ APIキー一覧表示
- ✅ APIキー削除（無効化）
- ✅ マスク表示/フル表示切替
- ✅ ワンクリックコピー

### 3. 使用状況管理
- ✅ リアルタイム使用量表示
- ✅ 分/時間/日単位の集計
- ✅ レート制限表示
- ✅ グラフィカルな使用状況

### 4. API検証
- ✅ リアルタイムAPIテスト
- ✅ エンドポイント動作確認
- ✅ レスポンス表示
- ✅ エラーハンドリング

## 🔐 セキュリティ

### APIキー管理
- HMAC-SHA256によるセキュアハッシュ
- KEY_PEPPER環境変数による追加保護
- 平文キーは一度だけ表示
- マスク表示がデフォルト

### アクセス制御
- Row Level Security (RLS)
- ユーザーごとのAPIキー分離
- レート制限実装
- 有効期限管理

## 📝 テスト手順

### 1. 新規ユーザー登録
```
1. /register にアクセス
2. メールアドレス・パスワード入力
3. 確認メール受信
4. アカウント有効化
```

### 2. APIキー発行
```
1. /dashboard にアクセス
2. 「新しいAPIキー」クリック
3. キー名入力
4. APIキーをコピー（一度だけ表示）
```

### 3. API呼び出しテスト
```bash
curl -i "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/v1_filings" \
  -H "x-api-key: YOUR_API_KEY"
```

## 🐛 トラブルシューティング

### 問題: ログインできない
- Supabase Authが有効か確認
- 環境変数が正しく設定されているか確認

### 問題: APIキーが作成できない
- Edge Functionsがデプロイされているか確認
- KEY_PEPPER環境変数が設定されているか確認

### 問題: APIキーが無効と表示される
- ハッシュ方式がHMAC-SHA256か確認
- KEY_PEPPERが一致しているか確認

## 📚 関連リンク

- [GitHub Repository](https://github.com/ruisu2000p/xbrl-api-minimal)
- [Vercel Dashboard](https://vercel.com/aas-projects-49d0d7ef/xbrl-api-minimal)
- [Supabase Dashboard](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx)
- [API Documentation](/docs)

## 🎉 完了チェックリスト

- [ ] Vercel環境変数設定
- [ ] Supabaseテーブル作成
- [ ] Edge Functionsデプロイ
- [ ] KEY_PEPPER設定
- [ ] テストユーザー作成
- [ ] APIキー発行テスト
- [ ] API呼び出しテスト

---

最終更新: 2025年8月31日