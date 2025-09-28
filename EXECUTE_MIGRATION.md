# SQLマイグレーション実行ガイド

## 🚀 実行手順

### 方法1: Supabase Dashboard から実行（簡単）

1. **Supabase Dashboardにログイン**
   - https://supabase.com/dashboard にアクセス
   - プロジェクトを選択

2. **SQL Editorを開く**
   - 左メニューから「SQL Editor」をクリック
   - 「New Query」ボタンをクリック

3. **マイグレーションファイルの内容をコピー**
   - `supabase/migrations/20250129_secure_pattern_implementation.sql` の内容を全てコピー
   - SQL Editorにペースト

4. **実行**
   - 「Run」ボタンをクリック
   - 成功メッセージが表示されることを確認

### 方法2: Supabase CLI から実行（開発者向け）

```bash
# Supabase CLIがインストールされていない場合
npm install -g supabase

# ログイン
supabase login

# プロジェクトとリンク
supabase link --project-ref [your-project-ref]

# マイグレーション実行
supabase db push
```

## ✅ 実行前チェックリスト

- [ ] Supabaseプロジェクトにログインできる
- [ ] private.profiles テーブルが既に存在する
- [ ] private.api_keys_main テーブルが既に存在する

## 📝 実行後の確認

### 1. VIEWが作成されているか確認

SQL Editorで以下を実行：

```sql
-- VIEWの存在確認
SELECT * FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('v_profiles', 'v_my_usage_stats');
```

### 2. RPC関数が作成されているか確認

```sql
-- RPC関数の一覧
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND routine_name IN (
  'update_my_profile',
  'get_my_api_keys',
  'generate_my_api_key',
  'revoke_my_api_key'
);
```

### 3. 動作テスト

#### プロファイルVIEWのテスト
```sql
-- 自分のプロファイルを確認
SELECT * FROM public.v_profiles WHERE id = auth.uid();
```

#### APIキー取得のテスト
```sql
-- APIキー一覧を取得
SELECT public.get_my_api_keys();
```

#### プロファイル更新のテスト
```sql
-- プロファイル更新
SELECT public.update_my_profile(
  p_full_name := 'Test User',
  p_username := 'testuser'
);
```

## 🔧 トラブルシューティング

### エラー: "relation does not exist"

**原因**: privateスキーマのテーブルが存在しない

**解決策**:
1. 先に基本テーブルを作成
```sql
-- private.profiles が存在しない場合
CREATE TABLE IF NOT EXISTS private.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  plan text DEFAULT 'beta',
  is_public boolean DEFAULT false,
  api_requests_count integer DEFAULT 0,
  api_requests_limit integer DEFAULT 1000,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);
```

### エラー: "permission denied"

**原因**: 権限不足

**解決策**: Service Roleで実行するか、管理者権限で実行

### エラー: "function already exists"

**原因**: 既に関数が存在する

**解決策**: 既存の関数を削除してから再作成
```sql
DROP FUNCTION IF EXISTS public.update_my_profile CASCADE;
-- その後、マイグレーションを再実行
```

## 📊 実行結果の確認

実行が成功すると、以下のメッセージが表示されます：

```
✅ 安全な構成パターンへの移行が完了しました
📌 重要: すべてのデータはprivateスキーマに保存
📌 公開アクセスはVIEW/RPC経由のみ
📌 auth.uid()で常に本人確認
```

## 🎯 次のステップ

1. **フロントエンドの動作確認**
   ```typescript
   // テストコード
   import { getMyProfile } from '@/lib/supabase/rpc-client'

   const profile = await getMyProfile()
   console.log('Profile:', profile)
   ```

2. **APIキー生成テスト**
   ```typescript
   import { generateApiKey } from '@/lib/supabase/rpc-client'

   const result = await generateApiKey('Test Key')
   if (result.success) {
     console.log('New API Key:', result.data.api_key)
     // このキーを安全に保存！
   }
   ```

3. **本番環境への適用**
   - 開発環境でテスト完了後
   - 本番のSupabase Dashboardで同じ手順を実行

## 📚 参考資料

- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/managing-migrations)
- [PostgreSQL VIEW Documentation](https://www.postgresql.org/docs/current/sql-createview.html)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)