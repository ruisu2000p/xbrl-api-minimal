# 📊 Supabase Table Editor でのAPIキー管理

## 現在のテーブル構造（api_keys）

Supabaseダッシュボード: https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/editor/26325?schema=public

### 確認されているカラム
- `id` (uuid) - プライマリキー
- `key_hash` (text) - APIキーのSHA256ハッシュ
- `key_prefix` (text) - APIキーの先頭部分
- `key_suffix` (text) - APIキーの末尾部分
- `user_id` (uuid) - ユーザーID
- `is_active` (boolean) - アクティブ状態
- `status` (text) - ステータス
- `created_at` (timestamp) - 作成日時
- `expires_at` (timestamp) - 有効期限
- `name` (text) - APIキー名
- `description` (text) - 説明
- `environment` (text) - 環境
- `permissions` (jsonb) - 権限
- その他...

## 🔑 あなたが発行したAPIキーの登録

### APIキー情報
```
平文: xbrl_live_oLk1j9lybJQ0QBcLR5VDULvMYL6AGA1w
SHA256 (Base64): Y6T0ZoihCgvSWe1O8ceqTYeyzr565coiwvy1wXAYrFg=
SHA256 (Hex): 63a4f46688a10a0bd259ed4ef1c7aa4d87b2cebe79e5ca22c2fcb5c17018ac58
Prefix: xbrl_live_oLk1j9
```

## 📝 Table Editorで直接追加する方法

### 1. Supabase Table Editorで新規行を追加

1. [api_keysテーブル](https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/editor/26325?schema=public)を開く
2. 「Insert row」ボタンをクリック
3. 以下の値を入力：

| カラム | 値 |
|--------|-----|
| **id** | （自動生成または空欄） |
| **key_hash** | `Y6T0ZoihCgvSWe1O8ceqTYeyzr565coiwvy1wXAYrFg=` |
| **key_prefix** | `xbrl_live_oLk1j9` |
| **key_suffix** | `GA1w` |
| **user_id** | `a0000000-0000-0000-0000-000000000001` |
| **is_active** | `true` |
| **status** | `active` |
| **name** | `Claude Desktop Production Key` |
| **description** | `Production API key for Claude Desktop MCP integration` |
| **environment** | `production` |
| **permissions** | `{"endpoints": ["*"], "scopes": ["read:markdown"]}` |
| **created_at** | （現在時刻） |
| **expires_at** | `2026-01-15 00:00:00` |
| **tier** | `pro` |

### 2. SQL Editorで追加（より確実）

```sql
-- 既存のレコードを確認
SELECT * FROM api_keys WHERE key_prefix = 'xbrl_live_oLk1j9';

-- 新規追加（既存がない場合）
INSERT INTO public.api_keys (
  id,
  key_hash,
  key_prefix,
  key_suffix,
  user_id,
  is_active,
  status,
  name,
  description,
  environment,
  permissions,
  created_at,
  expires_at,
  tier,
  total_requests,
  successful_requests,
  failed_requests
) VALUES (
  gen_random_uuid(),
  'Y6T0ZoihCgvSWe1O8ceqTYeyzr565coiwvy1wXAYrFg=',
  'xbrl_live_oLk1j9',
  'GA1w',
  COALESCE(
    (SELECT id FROM auth.users LIMIT 1),
    'a0000000-0000-0000-0000-000000000001'::uuid
  ),
  true,
  'active',
  'Claude Desktop Production Key',
  'Production API key for Claude Desktop MCP integration',
  'production',
  '{"endpoints": ["*"], "scopes": ["read:markdown"], "rate_limit": 10000}'::jsonb,
  now(),
  now() + interval '1 year',
  'pro',
  0,
  0,
  0
);

-- 確認
SELECT 
  id,
  name,
  key_prefix || '...' || key_suffix as display_key,
  is_active,
  status,
  created_at,
  expires_at
FROM api_keys 
WHERE key_prefix = 'xbrl_live_oLk1j9';
```

## 🔍 管理用SQLクエリ

### 全APIキーを表示
```sql
SELECT 
  id,
  name,
  key_prefix || '...' || key_suffix as display_key,
  is_active,
  status,
  environment,
  created_at,
  expires_at,
  total_requests
FROM api_keys
ORDER BY created_at DESC;
```

### アクティブなキーのみ表示
```sql
SELECT * FROM api_keys 
WHERE is_active = true 
  AND status = 'active'
  AND (expires_at IS NULL OR expires_at > now())
ORDER BY created_at DESC;
```

### 使用統計を表示
```sql
SELECT 
  name,
  key_prefix || '...' as key,
  total_requests,
  successful_requests,
  failed_requests,
  ROUND(100.0 * successful_requests / NULLIF(total_requests, 0), 2) as success_rate,
  last_used_at,
  created_at
FROM api_keys
WHERE total_requests > 0
ORDER BY total_requests DESC;
```

### APIキーを無効化
```sql
UPDATE api_keys 
SET 
  is_active = false,
  status = 'revoked',
  revoked_at = now(),
  revoke_reason = 'Manual revocation'
WHERE key_prefix = 'xbrl_live_oLk1j9';
```

## 📊 ダッシュボードビュー作成

### 管理者用ビュー（SQL View）
```sql
CREATE OR REPLACE VIEW api_keys_dashboard AS
SELECT 
  ak.id,
  ak.name,
  ak.key_prefix || '...' || COALESCE(ak.key_suffix, '') as display_key,
  ak.is_active,
  ak.status,
  ak.environment,
  ak.created_at,
  ak.expires_at,
  ak.total_requests,
  ak.successful_requests,
  ak.failed_requests,
  ak.last_used_at,
  au.email as user_email
FROM api_keys ak
LEFT JOIN auth.users au ON ak.user_id = au.id
ORDER BY ak.created_at DESC;

-- ビューを使用
SELECT * FROM api_keys_dashboard;
```

## 🛠️ トラブルシューティング

### APIキーが認証されない場合

1. **ハッシュ形式を確認**
```sql
-- Base64形式
SELECT * FROM api_keys WHERE key_hash = 'Y6T0ZoihCgvSWe1O8ceqTYeyzr565coiwvy1wXAYrFg=';

-- Hex形式（\xプレフィックス付き）
SELECT * FROM api_keys WHERE key_hash = '\x63a4f46688a10a0bd259ed4ef1c7aa4d87b2cebe79e5ca22c2fcb5c17018ac58';
```

2. **アクティブ状態を確認**
```sql
UPDATE api_keys 
SET is_active = true, status = 'active'
WHERE key_prefix = 'xbrl_live_oLk1j9';
```

3. **有効期限を延長**
```sql
UPDATE api_keys 
SET expires_at = now() + interval '1 year'
WHERE key_prefix = 'xbrl_live_oLk1j9';
```

## 🔐 セキュリティ注意事項

1. **平文のAPIキーは絶対にデータベースに保存しない**
2. **key_hashにはSHA256ハッシュのみを保存**
3. **定期的に未使用のキーを無効化**
4. **アクセスログを定期的に監査**

## 📱 アプリケーションとの連携

### APIキー検証ロジック（app/api/_lib/authByApiKey.ts）
```typescript
// APIキーをハッシュ化して検証
const keyHash = crypto.createHash('sha256').update(apiKey).digest('base64');

// データベースで検索
const { data } = await admin
  .from('api_keys')
  .select('*')
  .eq('key_hash', keyHash)
  .eq('is_active', true)
  .single();
```

### 使用状況の更新
```sql
-- API呼び出し時に自動更新
UPDATE api_keys 
SET 
  total_requests = total_requests + 1,
  successful_requests = successful_requests + 1,
  last_used_at = now(),
  last_used_ip = '${ip_address}'
WHERE id = '${api_key_id}';
```

---

これで、Supabase Table Editorから直接APIキーを管理できます。
Table EditorのUIまたは上記のSQLクエリを使用してください。