# XBRL財務API JWT認証システム修正手順書

**作成日**: 2025年9月21日
**対象システム**: Supabase Edge Functions + PostgreSQL + カスタムAPIキー認証

## 概要

カスタムAPIキー `xbrl_v1_*` 形式での認証が失敗していた問題を解決し、完全なJWT認証システムを構築しました。

## 実施した手続き

### 1. 問題の詳細分析 🔍

#### 1.1 初期状況の確認
- **症状**: カスタムAPIキー使用時に "Invalid JWT" エラー
- **動作確認済み**: SupabaseのAnon Keyでは正常動作
- **環境変数**: JWT_SECRET、SUPABASE_SERVICE_ROLE_KEY は正しく設定済み

#### 1.2 デバッグ体制の構築
```javascript
// 詳細ログ出力機能をEdge Functionに追加
const debugInfo = {
  step: '',
  apiKeyLength: apiKey?.length || 0,
  jwtSecretLength: jwtSecret?.length || 0,
  timestamp: new Date().toISOString()
}
```

### 2. データベース層の修正 🗄️

#### 2.1 既存関数の問題特定
```sql
-- 問題のあった関数（SHA256ハッシュ使用）
SELECT verify_api_key_hash('xbrl_v1_ead23e30246d88250fdf4423c1e1491d');
-- 結果: false（bcryptハッシュとの不一致）
```

#### 2.2 pgcrypto拡張の確認と利用
```sql
-- pgcrypto拡張機能が利用可能であることを確認
SELECT name, installed_version FROM pg_available_extensions
WHERE name = 'pgcrypto';
-- 結果: version 1.3 利用可能
```

#### 2.3 データベース関数の完全修正
```sql
-- 旧関数を削除
DROP FUNCTION IF EXISTS verify_api_key_hash(text);

-- bcrypt対応の新関数を作成
CREATE OR REPLACE FUNCTION verify_api_key_hash(input_api_key TEXT)
RETURNS TABLE(id UUID, name VARCHAR(255), tier VARCHAR(50), created_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT ak.id, ak.name, ak.tier, ak.created_at
  FROM api_keys ak
  WHERE crypt(input_api_key, ak.key_hash) = ak.key_hash
    AND ak.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2.4 テストデータの作成
```sql
-- 検証用APIキーレコードを作成
INSERT INTO api_keys (id, name, key_hash, tier, is_active, masked_key)
VALUES (
  gen_random_uuid(),
  'test-key-for-jwt',
  crypt('xbrl_v1_ead23e30246d88250fdf4423c1e1491d', gen_salt('bf', 6)),
  'free',
  true,
  'xbrl_v1_ead2****491d'
);
```

### 3. Edge Function層の修正 ⚡

#### 3.1 JWT生成ロジックの改修
```typescript
// 従来の問題のあるアプローチ
const { data: apiKeyData, error } = await supabase
  .from('api_keys')
  .select('*')
  .eq('masked_key', masked)  // ← マスクキーでの検索

// 修正後のアプローチ
const { data: keyData, error: keyError } = await supabase
  .rpc('verify_api_key_hash', { input_api_key: apiKey })  // ← RPC関数で直接検証
```

#### 3.2 Supabase互換JWT形式への変更
```typescript
// 従来の独自形式（動作しない）
const payload = {
  iss: 'xbrl-financial-api',
  sub: apiKeyInfo.id.toString(),
  aud: 'xbrl-api',
  role: `xbrl_${apiKeyInfo.tier}`
}

// Supabase互換形式（正常動作）
const payload = {
  iss: 'supabase',
  ref: 'wpwqxhyiglbtlaimrjrx',
  aud: 'authenticated',
  role: 'authenticated',
  sub: apiKeyInfo.id.toString(),
  email: `apikey-${apiKeyInfo.id}@xbrl-api.local`,
  app_metadata: {
    provider: 'xbrl-api',
    tier: apiKeyInfo.tier,
    api_key_id: apiKeyInfo.id
  },
  user_metadata: {
    api_key_name: apiKeyInfo.name,
    tier: apiKeyInfo.tier
  }
}
```

### 4. 段階的テストと検証 🧪

#### 4.1 データベース関数の単体テスト
```sql
-- API キー検証の確認
SELECT * FROM verify_api_key_hash('xbrl_v1_ead23e30246d88250fdf4423c1e1491d');
-- 結果: 1件のレコード（成功）
```

#### 4.2 Edge Functionのデプロイメント
```bash
npx supabase functions deploy xbrl-api-gateway-jwt --project-ref wpwqxhyiglbtlaimrjrx
# デプロイ成功: script size 91.26kB
```

#### 4.3 統合テストの実行
```javascript
// 詳細デバッグテストスクリプト
const response = await fetch(GATEWAY_URL, {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});
```

### 5. 技術的な解決ポイント 🎯

#### 5.1 bcrypt検証の正確な実装
- **課題**: SHA256ハッシュとbcryptハッシュの混在
- **解決**: PostgreSQLの`crypt()`関数を使用した正確な検証

#### 5.2 Supabase認証システムとの互換性
- **課題**: 独自JWT形式がSupabaseで認証されない
- **解決**: `iss: 'supabase'`, `aud: 'authenticated'`を使用

#### 5.3 デバッグ情報の体系的な収集
- **実装**: 各ステップでのエラー情報とデバッグデータの記録
- **効果**: 問題箇所の迅速な特定

### 6. 最終的なシステム構成 🏗️

```
┌─────────────────┐    ┌────────────────────┐    ┌─────────────────┐
│   Client App    │───▶│   Edge Function    │───▶│   PostgreSQL    │
│                 │    │  (JWT Gateway)     │    │   (API Keys)    │
└─────────────────┘    └────────────────────┘    └─────────────────┘
         │                        │                        │
    API Key              JWT Generation              bcrypt Verification
 xbrl_v1_xxx...           Supabase Format            crypt() function
```

#### システムフロー:
1. **クライアント**: `xbrl_v1_*` APIキーでリクエスト
2. **Edge Function**: RPC関数でAPIキー検証
3. **PostgreSQL**: bcryptでハッシュ照合
4. **Edge Function**: Supabase互換JWTを生成
5. **Supabase**: JWTで認証・データアクセス

### 7. 品質保証と運用準備 ✅

#### 7.1 テストケースの確立
- [x] 有効なAPIキーでの認証成功
- [x] 無効なAPIキーでの認証拒否
- [x] JWT形式の正確性検証
- [x] エンドポイントアクセステスト

#### 7.2 ログ・監視体制
- Edge Functionログでのリクエスト追跡
- データベースレベルでの認証ログ記録
- 詳細なエラー情報の構造化出力

### 8. 技術仕様書 📋

#### 8.1 APIキー仕様
- **形式**: `xbrl_v1_[32桁英数字]`
- **ハッシュ**: bcrypt (rounds=6)
- **ティア**: free, basic, premium

#### 8.2 JWT仕様
- **アルゴリズム**: HS256
- **有効期限**: 1時間
- **必須クレーム**: iss, ref, aud, sub, role
- **カスタムクレーム**: app_metadata, user_metadata

#### 8.3 セキュリティ設定
- **環境変数**: JWT_SECRET (88文字), SUPABASE_SERVICE_ROLE_KEY
- **CORS設定**: 全オリジン許可（プロダクションでは制限）
- **認証方式**: Bearer Token (Authorization ヘッダー)

## 成果と今後の展開 🚀

### 達成された機能
- [x] カスタムAPIキーによる認証システム
- [x] Supabase互換JWT生成
- [x] ティア別アクセス制御の基盤
- [x] 包括的なエラーハンドリング

### 今後の拡張可能性
- レート制限の実装
- 使用量分析ダッシュボード
- 複数プロジェクトへの展開
- 高度なセキュリティ監査機能

## 実装ファイル一覧

### Edge Function
- `C:\Users\pumpk\supabase\functions\xbrl-api-gateway-jwt\index.ts` - メインのJWT認証ゲートウェイ
- `C:\Users\pumpk\supabase\functions\debug-jwt\index.ts` - デバッグ用Function

### テストスクリプト
- `C:\Users\pumpk\test-edge-function-direct.js` - 直接テスト
- `C:\Users\pumpk\test-edge-debug-detailed.js` - 詳細デバッグテスト
- `C:\Users\pumpk\test-with-supabase-jwt.js` - Supabase JWTテスト
- `C:\Users\pumpk\test-bcrypt-local.js` - ローカルbcrypt検証
- `C:\Users\pumpk\test-cors-and-headers.js` - CORSヘッダーテスト

### データベーススクリプト
- `verify_api_key_hash()` 関数 - bcryptによるAPIキー検証
- `api_keys` テーブル - APIキー管理

## トラブルシューティング

### よくある問題と解決方法

#### 1. "Invalid JWT" エラー
**原因**: JWT形式がSupabase互換でない
**解決**: ペイロードに`iss: 'supabase'`, `aud: 'authenticated'`を含める

#### 2. bcrypt検証失敗
**原因**: データベース関数でSHA256を使用
**解決**: `crypt()`関数を使用したbcrypt検証に変更

#### 3. Environment Variable未設定
**原因**: JWT_SECRETが設定されていない
**解決**: Supabaseダッシュボードで環境変数を設定

#### 4. デプロイエラー
**原因**: 関数の戻り値型の不一致
**解決**: PostgreSQL関数の戻り値型を正確に定義

## セキュリティ考慮事項

### 実装済みセキュリティ対策
- bcryptによるAPIキーハッシュ化
- JWT有効期限の設定（1時間）
- Service Role Keyの適切な管理
- CORS設定による不正アクセス防止

### 今後必要なセキュリティ強化
- レート制限の実装
- 異常なアクセスパターンの検知
- APIキーのローテーション機能
- 監査ログの詳細化

---

**作成者**: XBRL財務APIシステム開発チーム
**最終更新**: 2025年9月21日 22:40 JST
**プロジェクト**: Supabase wpwqxhyiglbtlaimrjrx