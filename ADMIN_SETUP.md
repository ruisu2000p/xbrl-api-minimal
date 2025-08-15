# 管理者セットアップガイド

## 🔐 管理者アカウント情報

### デフォルト管理者アカウント
```
メールアドレス: admin@xbrl-api.com
パスワード: Admin@2024#XBRL
管理者ID: a0000000-0000-0000-0000-000000000001
```

## 📋 セットアップ手順

### 1. Supabaseでユーザーテーブル作成

1. [Supabase Dashboard](https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo) にログイン
2. 左メニューから「SQL Editor」を選択
3. 以下のSQLファイルを順番に実行:
   - `sql/admin-tables.sql` - 管理者機能用テーブル
   - `sql/create-admin-user.sql` - 管理者ユーザー作成

### 2. Supabase Authenticationで管理者作成

1. Supabaseダッシュボードで「Authentication」→「Users」を選択
2. 「Create new user」をクリック
3. 以下の情報を入力:
   - Email: `admin@xbrl-api.com`
   - Password: `Admin@2024#XBRL`
   - ✅ Auto Confirm User にチェック
4. 「Create user」をクリック

### 3. 管理者ダッシュボードアクセス

#### ローカル環境
```
http://localhost:3000/admin/login
```

#### 本番環境
```
https://xbrl-api-minimal.vercel.app/admin/login
```

## 📊 管理者ダッシュボード機能

### メイン機能
- 📈 **リアルタイム統計** - ユーザー数、収益、API使用状況
- 👥 **ユーザー管理** - 検索、フィルタ、ステータス変更
- 💰 **収益分析** - プラン別収益、チャーン率
- 🔌 **API監視** - エンドポイント別統計、エラー率
- ⚙️ **システム監視** - 稼働率、バックアップ状況

### ユーザー管理機能
- ユーザー一覧表示（ページネーション対応）
- プラン別フィルタリング
- ユーザー検索
- アカウントの有効化/無効化
- 詳細情報の閲覧
- API使用状況の確認

### データ表示
- **総ユーザー数**: Supabaseから取得した実データ
- **月間収益**: プランに基づいて自動計算
- **API呼び出し数**: api_usage_logsテーブルから集計
- **システム稼働率**: system_metricsテーブルから取得

## 🔧 トラブルシューティング

### ログインできない場合

1. **Supabase Authユーザーの確認**
   ```sql
   -- SQL Editorで実行
   SELECT * FROM auth.users WHERE email = 'admin@xbrl-api.com';
   ```

2. **usersテーブルの確認**
   ```sql
   SELECT * FROM users WHERE email = 'admin@xbrl-api.com';
   ```

3. **環境変数の確認**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### データが表示されない場合

1. **APIエンドポイントの確認**
   ```bash
   curl http://localhost:3000/api/admin/statistics
   ```

2. **Supabase接続の確認**
   ```bash
   curl http://localhost:3000/api/test-supabase
   ```

## 🛡️ セキュリティ注意事項

1. **本番環境では必ず変更**
   - デフォルトパスワードを変更
   - 管理者メールアドレスを変更

2. **アクセス制限**
   - 管理者IPアドレスの制限を検討
   - 2要素認証の導入を推奨

3. **監査ログ**
   - admin_activity_logsテーブルで全操作を記録
   - 定期的な監査を実施

## 📝 追加の管理者作成

新しい管理者を追加する場合:

```sql
-- SQL Editorで実行
INSERT INTO users (
  email,
  name,
  role,
  subscription_plan,
  is_active
) VALUES (
  'new-admin@example.com',
  '新管理者名',
  'admin',
  'pro',
  true
);
```

その後、Supabase Authenticationでも同じメールアドレスでユーザーを作成してください。

## 🔄 定期メンテナンス

### 月次タスク
- API使用量カウンターのリセット
- 古いログデータのアーカイブ
- バックアップの確認

### SQLでの月次リセット
```sql
-- 月次API使用量リセット
UPDATE users SET monthly_api_calls = 0;

-- 古いログの削除（3ヶ月以上前）
DELETE FROM api_usage_logs 
WHERE created_at < NOW() - INTERVAL '3 months';
```

## 📞 サポート

問題が発生した場合:
- GitHub Issues: https://github.com/ruisu2000p/xbrl-api-minimal/issues
- Supabase Support: https://supabase.com/support