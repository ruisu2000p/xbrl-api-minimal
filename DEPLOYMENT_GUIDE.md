# 🚀 デプロイメントガイド - 強化版セキュリティ実装

## 📋 実装完了項目

### 1. SQLパッチファイル作成済み
- **ファイル**: `sql/enhanced-security-patch.sql`
- **内容**:
  - api_keysテーブルの堅牢化（user_id NOT NULL、ユニークインデックス）
  - RLSポリシー強化（クライアントからのINSERT/UPDATE禁止）
  - incr_usage_and_get RPC関数（自動リセット機能付き）
  - 更新日時自動更新トリガー

### 2. コード更新完了
- **utils.ts**: 
  - authenticateApiKey関数を新スキーマ対応
  - checkRateLimit関数をRPC使用に変更
- **keys_issue/index.ts**: 既に対応済み（key_suffix、masked_key保存）
- **v1_filings/index.ts**: 新しい認証フロー対応

## 📝 デプロイ手順

### ステップ1: SQLパッチ適用
1. [Supabase SQL Editor](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/sql)を開く
2. `sql/enhanced-security-patch.sql`の内容を全てコピー
3. SQL Editorに貼り付けて「Run」ボタンをクリック
4. 成功メッセージを確認

### ステップ2: Supabase Functions デプロイ
```bash
# プロジェクトディレクトリに移動
cd C:\Users\pumpk\xbrl-api-minimal

# Supabase CLIでログイン（初回のみ）
npx supabase@latest login

# プロジェクトをリンク（初回のみ）
npx supabase@latest link --project-ref wpwqxhyiglbtlaimrjrx

# Functions をデプロイ
npx supabase@latest functions deploy keys_issue
npx supabase@latest functions deploy v1_filings
```

### ステップ3: 環境変数確認
[Functions Settings](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/functions)で以下を確認:
- `SUPABASE_URL`: 自動設定
- `SUPABASE_SERVICE_ROLE_KEY`: 自動設定
- `KEY_PEPPER`: （任意）ハッシュ用のソルト

### ステップ4: 認証設定確認
[Auth Settings](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/auth/email-templates)で:
- **Enable email confirmations**: OFF（テスト用）
- 本番環境では有効化を推奨

## 🧪 動作確認

### テスト1: HTMLページでの確認
```bash
# テストページを開く
cd C:\Users\pumpk\xbrl-api-minimal
start test-api-frontend.html
```

1. ユーザー登録
2. ログイン
3. APIキー発行
4. API呼び出しテスト

### テスト2: Node.jsスクリプトでの確認
```bash
node test-api-direct.js
```

### テスト3: cURLでの確認
```bash
# 1. ユーザー登録
curl -X POST https://wpwqxhyiglbtlaimrjrx.supabase.co/auth/v1/signup \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"Test1234!\"}"

# 2. APIキー発行（access_tokenを使用）
curl -X POST https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/keys_issue \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 3. API使用
curl https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/v1_filings?limit=5 \
  -H "x-api-key: YOUR_API_KEY"
```

## ✅ セキュリティ強化ポイント

1. **APIキー管理**
   - ハッシュ化保存（SHA-256）
   - プレフィックス・サフィックスのみ表示
   - Service Role経由でのみ発行可能

2. **レート制限**
   - 分/時/日の3段階制限
   - 自動リセット機能（境界で自動的にカウンタリセット）
   - アトミックな更新（競合状態なし）

3. **RLS（Row Level Security）**
   - ユーザーは自分のAPIキーのみ閲覧可能
   - クライアントからの書き込み完全禁止
   - Service Role経由のみ操作可能

## 🔍 トラブルシューティング

### エラー: "column 'api_key_id' does not exist"
→ SQLパッチが正しく適用されていない。再度SQL実行。

### エラー: "function incr_usage_and_get does not exist"
→ RPC関数が作成されていない。SQLパッチの実行を確認。

### エラー: "Invalid API key"
→ APIキーのプレフィックスまたはハッシュが一致しない。キーを再発行。

### エラー: "Too Many Requests"
→ レート制限に達した。次の境界（分/時/日）まで待機。

## 📊 モニタリング

### Functions ログ確認
[Functions Logs](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/functions)

### データベース確認
```sql
-- APIキー状況確認
SELECT * FROM api_keys WHERE user_id = 'YOUR_USER_ID';

-- 使用状況確認
SELECT * FROM usage_counters WHERE api_key_id = 'YOUR_KEY_ID';

-- 最近のAPI使用状況
SELECT 
  ak.masked_key,
  uc.minute_count,
  uc.hour_count,
  uc.day_count,
  uc.total_count,
  uc.updated_at
FROM api_keys ak
JOIN usage_counters uc ON ak.id = uc.api_key_id
WHERE ak.is_active = true
ORDER BY uc.updated_at DESC
LIMIT 10;
```

## 🎉 完了

これで強化版セキュリティシステムの実装が完了しました！

主な改善点:
- ✅ 堅牢なAPIキー管理
- ✅ 自動リセット付きレート制限
- ✅ RLSによる厳格なアクセス制御
- ✅ アトミックな使用状況更新
- ✅ CORS対応

次のステップ:
1. 本番環境でのテスト
2. メール確認の有効化
3. 監視ツールの設定
4. バックアップスケジュールの設定