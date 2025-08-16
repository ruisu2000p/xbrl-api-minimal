# 📊 Supabase管理者ガイド - APIキー管理

## 🔑 発行されたAPIキーについて

あなたが発行したAPIキー:
```
xbrl_live_oLk1j9lybJQ0QBcLR5VDULvMYL6AGA1w
```

このキーは以下の場所に保存されています：

### 1. Supabaseデータベース（api_keysテーブル）

**保存形式**: SHA256ハッシュ化
- 平文のAPIキーは保存されていません
- `key_hash`カラムにハッシュ値として保存
- `key_prefix`カラムに先頭16文字のみ保存（表示用）

### 2. Supabaseでの確認方法

#### A. Supabase Dashboard経由

1. [Supabase Dashboard](https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo)にログイン
2. **Table Editor** → `api_keys`テーブルを選択
3. 以下の情報が確認できます：
   - `user_id`: 発行したユーザーのID
   - `name`: APIキーの名前（例：Claude Desktop）
   - `key_prefix`: `sk_live_xbrl_oLk1j9...`（先頭部分）
   - `key_hash`: ハッシュ化された値
   - `scopes`: 権限（['read:markdown']）
   - `created_at`: 作成日時
   - `last_used_at`: 最終使用日時

#### B. SQL Editorで確認

```sql
-- 全APIキーを確認
SELECT 
  ak.id,
  ak.user_id,
  ak.name,
  ak.key_prefix,
  ak.scopes,
  ak.revoked,
  ak.created_at,
  ak.last_used_at,
  au.email
FROM api_keys ak
LEFT JOIN auth.users au ON ak.user_id = au.id
ORDER BY ak.created_at DESC;

-- アクティブなAPIキーのみ
SELECT * FROM api_keys 
WHERE revoked = false 
ORDER BY created_at DESC;

-- 特定のプレフィックスで検索
SELECT * FROM api_keys 
WHERE key_prefix LIKE 'sk_live_xbrl_oLk1j9%';
```

### 3. APIアクセスログの確認

```sql
-- APIキーの使用状況を確認
SELECT 
  al.created_at,
  al.endpoint,
  al.method,
  al.status_code,
  al.response_time_ms,
  al.ip_address,
  ak.name as api_key_name,
  au.email
FROM api_access_logs al
JOIN api_keys ak ON al.api_key_id = ak.id
JOIN auth.users au ON al.user_id = au.id
ORDER BY al.created_at DESC
LIMIT 100;

-- 今日のAPI使用状況
SELECT 
  COUNT(*) as total_requests,
  AVG(response_time_ms) as avg_response_time,
  MAX(response_time_ms) as max_response_time
FROM api_access_logs
WHERE created_at > CURRENT_DATE;
```

### 4. 管理者画面でのAPIキー管理

#### アクセス方法

1. **本番環境**: https://xbrl-api-minimal.vercel.app/admin
2. **管理者パスワード**: `admin2025xbrl`

#### 機能

- 全ユーザーのメールアドレス表示
- 各ユーザーのAPIキー一覧
- APIキーの状態（有効/無効）
- 使用統計（今日/今月のリクエスト数）
- APIキーの無効化

### 5. APIキーのセキュリティ

#### 保存方法
- **平文**: 絶対に保存しない
- **ハッシュ**: SHA256（不可逆）
- **表示**: プレフィックスのみ（`sk_live_xbrl_xxxx...`）

#### 管理ルール
1. APIキーは発行時のみ平文表示
2. 紛失した場合は再発行が必要
3. 不要なキーは即座に無効化
4. 定期的な監査とローテーション推奨

### 6. トラブルシューティング

#### APIキーが動作しない場合

```sql
-- APIキーの状態を確認
SELECT 
  key_prefix,
  revoked,
  expires_at,
  last_used_at
FROM api_keys 
WHERE key_prefix LIKE 'sk_live_xbrl_oLk1j9%';
```

チェック項目:
- `revoked = false`（無効化されていない）
- `expires_at > NOW()`（有効期限内）
- `key_hash`が正しく保存されている

#### レート制限の確認

```sql
-- 過去1分間のリクエスト数
SELECT COUNT(*) 
FROM api_access_logs 
WHERE api_key_id = (
  SELECT id FROM api_keys 
  WHERE key_prefix LIKE 'sk_live_xbrl_oLk1j9%'
)
AND created_at > NOW() - INTERVAL '1 minute';
```

### 7. 統計情報

```sql
-- APIキー統計
SELECT 
  COUNT(DISTINCT user_id) as total_users,
  COUNT(*) as total_keys,
  COUNT(*) FILTER (WHERE revoked = false) as active_keys,
  COUNT(*) FILTER (WHERE revoked = true) as revoked_keys
FROM api_keys;

-- 日別使用状況
SELECT 
  DATE(created_at) as date,
  COUNT(*) as requests,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(response_time_ms) as avg_response_time
FROM api_access_logs
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

### 8. ユーザー管理

```sql
-- ユーザーとAPIキーの関連
SELECT 
  u.email,
  u.created_at as user_created,
  COUNT(k.id) as api_keys_count,
  COUNT(k.id) FILTER (WHERE k.revoked = false) as active_keys,
  MAX(k.created_at) as last_key_created
FROM auth.users u
LEFT JOIN api_keys k ON u.id = k.user_id
GROUP BY u.id, u.email, u.created_at
ORDER BY user_created DESC;
```

### 9. セキュリティ監査

```sql
-- 異常なアクセスパターンの検出
SELECT 
  user_id,
  COUNT(*) as request_count,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT endpoint) as unique_endpoints
FROM api_access_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 100  -- 1時間に100回以上
ORDER BY request_count DESC;
```

### 10. バックアップとリカバリ

```sql
-- APIキー情報のバックアップ（ハッシュのみ）
SELECT 
  id,
  user_id,
  name,
  key_prefix,
  key_hash,
  scopes,
  revoked,
  created_at,
  expires_at
FROM api_keys
ORDER BY created_at;
```

---

## 📝 重要な注意事項

1. **APIキーの平文（`xbrl_live_oLk1j9lybJQ0QBcLR5VDULvMYL6AGA1w`）は絶対に公開しない**
2. このキーはClaude Desktop MCPの設定にのみ使用
3. 管理者パスワード（`admin2025xbrl`）は本番環境では変更必須
4. 定期的にアクセスログを監査
5. 不審なアクセスパターンを発見したら即座に対応

---

最終更新: 2025年1月