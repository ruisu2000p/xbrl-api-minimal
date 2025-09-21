# XBRLファイナンシャルAPI セキュリティ実装ガイド

## 現在の実装状況と改善提案

### 🔴 現在の問題点

1. **RLSが無効化されている**
   - `api_keys`テーブルのRow Level Securityが無効
   - すべてのユーザーが全APIキーにアクセス可能な状態

2. **Service Role Keyの不適切な使用**
   - 開発環境でService Role Keyを直接使用
   - RLSをバイパスするため、セキュリティリスクが高い

### ✅ セキュリティ改善の実装

## 1. データベースセキュリティ（RLS）

### 本番環境用のRLSポリシー
```sql
-- RLSを有効化
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のAPIキーのみアクセス可能
CREATE POLICY "auth_users_view_own_keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

### 開発環境との分離
```sql
-- 環境変数で制御可能な開発モード
CREATE OR REPLACE FUNCTION is_development_mode()
RETURNS boolean AS $$
BEGIN
  RETURN coalesce(
    current_setting('app.development_mode', true) = 'true',
    false
  );
END;
$$ LANGUAGE plpgsql;

-- 開発モードでのみ動作するポリシー
CREATE POLICY "development_mode_access"
  ON api_keys FOR ALL
  TO anon, authenticated
  USING (is_development_mode());
```

## 2. 環境別設定

### 開発環境（.env.development）
```env
NODE_ENV=development
NEXT_PUBLIC_USE_LOCAL_AUTH=true
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # 開発のみ
RATE_LIMIT_ENABLED=false
ENABLE_SECURITY_MONITORING=false
```

### 本番環境（.env.production）
```env
NODE_ENV=production
NEXT_PUBLIC_USE_LOCAL_AUTH=false
# Service Role Keyは設定しない
RATE_LIMIT_ENABLED=true
ENABLE_SECURITY_MONITORING=true
```

## 3. APIキー管理のベストプラクティス

### APIキーのハッシュ化
```typescript
// APIキーは常にハッシュ化して保存
const keyHash = await crypto.subtle.digest('SHA-256', apiKey);
```

### レート制限の実装
```typescript
// 1分間に100リクエストまでの制限
const rateLimit = await checkRateLimit(apiKeyId, 100);
if (!rateLimit) {
  throw new Error('Rate limit exceeded');
}
```

## 4. セキュリティ監視

### 不審なアクティビティの検出
```sql
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- 短時間に大量のAPIキー作成を検出
  IF (SELECT COUNT(*) FROM api_keys
      WHERE user_id = NEW.user_id
      AND created_at > NOW() - INTERVAL '1 hour') > 5
  THEN
    INSERT INTO security_alerts (user_id, alert_type, severity)
    VALUES (NEW.user_id, 'excessive_api_key_creation', 'medium');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 監査ログの実装
```typescript
// すべてのAPIキー操作をログ記録
await logSecurityEvent({
  type: 'api_key_created',
  userId: user.id,
  description: `New API key created: ${keyName}`,
  severity: 'low'
});
```

## 5. 移行手順

### Step 1: 開発環境での確認
1. `.env.development.example`を`.env.local`にコピー
2. 開発環境フラグを設定
3. localStorage認証で動作確認

### Step 2: ステージング環境でのテスト
1. RLSポリシーを適用
2. Supabase認証でテスト
3. レート制限の動作確認

### Step 3: 本番環境への適用
1. マイグレーションファイルを実行
2. 環境変数を本番用に設定
3. モニタリングを有効化

## 6. セキュリティチェックリスト

### 開発時
- [ ] Service Role Keyは開発環境のみで使用
- [ ] localStorage認証は開発環境のみ
- [ ] コンソールログは本番環境で無効化

### デプロイ前
- [ ] RLSが有効化されている
- [ ] Service Role Keyが本番環境変数にない
- [ ] レート制限が設定されている
- [ ] セキュリティヘッダーが設定されている
- [ ] 監査ログが有効化されている

### 定期的な確認
- [ ] 期限切れAPIキーの削除
- [ ] 未使用APIキーの無効化
- [ ] セキュリティアラートの確認
- [ ] アクセスログの監視

## 7. トラブルシューティング

### RLS関連のエラー
```sql
-- RLSポリシーの確認
SELECT * FROM pg_policies WHERE tablename = 'api_keys';

-- 権限の確認
SELECT has_table_privilege('anon', 'api_keys', 'SELECT');
```

### APIキー認証の問題
```typescript
// APIキーのデバッグ
console.log('API Key validation:', {
  hasKey: !!apiKey,
  keyLength: apiKey?.length,
  hashMatch: keyHash === storedHash
});
```

## 8. 推奨事項

### 本番環境での必須設定
1. **RLSを必ず有効化**
2. **Service Role Keyは使用しない**
3. **HTTPSのみ許可**
4. **レート制限を設定**
5. **監査ログを有効化**

### セキュリティ向上のための追加対策
1. **IPホワイトリスト**
2. **異常検知アラート**
3. **定期的なセキュリティ監査**
4. **APIキーの自動ローテーション**
5. **暗号化の強化**

---

## まとめ

現在の実装は開発環境では動作しますが、本番環境ではセキュリティリスクがあります。このガイドに従って、段階的にセキュリティを強化してください。

特に重要なのは：
1. RLSの有効化
2. Service Role Keyの適切な管理
3. 環境別の設定分離

これらの実装により、開発の利便性を保ちながら、本番環境でのセキュリティを確保できます。