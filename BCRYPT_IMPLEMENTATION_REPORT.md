# APIキーシステムbcrypt実装レポート

## 📅 実装日: 2025-01-28

## 📊 現状分析結果

### ✅ 既に実装済みの内容

1. **verify_api_key_hash関数**
   - **状態**: ✅ bcrypt対応済み
   - `crypt(v_key_secret, found_record.key_hash) = found_record.key_hash`でbcrypt検証を実施

2. **create_api_key_bcrypt関数**
   - **状態**: ✅ bcrypt対応済み
   - `extensions.crypt('xbrl_v1_' || v_raw_key, extensions.gen_salt('bf'))`でbcryptハッシュ生成

3. **create_api_key_complete_v2関数**
   - **状態**: ✅ bcrypt対応済み
   - `crypt(v_api_key, gen_salt('bf'))`でbcryptハッシュ生成

4. **既存APIキーデータ**
   - **状態**: ✅ 全15個のキーがbcryptハッシュ
   - SHA-256やMD5のキーは存在しない

### ❌ 修正が必要だった内容

1. **create_api_key関数（デフォルト）**
   - **問題**: MD5ハッシュを使用（`md5(v_api_key)`）
   - **対応**: bcryptに変更するマイグレーションファイルを作成

## 🔧 実施した対応

### 1. マイグレーションファイルの作成

**ファイル**: `supabase/migrations/20250128_update_api_key_to_bcrypt.sql`

主な変更内容：
- `create_api_key`関数をbcryptに変更
- `verify_api_key_hash`関数の再定義（確認用）
- 新しい統一関数`issue_api_key`の作成
- インデックスの最適化

### 2. 統一APIキー発行関数の作成

```sql
CREATE OR REPLACE FUNCTION public.issue_api_key(
    p_user_id UUID,
    p_name TEXT DEFAULT 'API Key',
    p_tier TEXT DEFAULT 'free',
    p_description TEXT DEFAULT NULL
)
RETURNS jsonb
```

**特徴**:
- bcryptハッシュを使用
- 認証チェック機能
- 1ユーザー1キー制約の実装
- JSONレスポンス形式

### 3. テストスクリプトの作成

**ファイル**: `test-bcrypt-api-key.js`

テスト項目：
- APIキーの発行（bcrypt）
- APIキーの検証（bcrypt）
- 無効キーの拒否
- ハッシュ形式の確認
- Edge Function経由の認証

## 🔒 セキュリティ改善

### bcryptの利点
1. **計算コストが高い**: ブルートフォース攻撃に強い
2. **ソルト自動生成**: レインボーテーブル攻撃を防ぐ
3. **コストファクター調整可能**: 将来的にセキュリティ強度を上げられる

### 実装のベストプラクティス
1. `SECURITY DEFINER`で関数を保護
2. `search_path`を明示的に設定
3. 権限を適切に設定（authenticated, anon, service_role）

## 📈 パフォーマンス考慮事項

### bcryptの影響
- **ハッシュ生成**: 約50-100ms（MD5の1000倍以上遅い）
- **検証時間**: 約50-100ms
- **推奨**: API発行は頻繁ではないため問題なし

## 🚀 今後の推奨事項

### 1. マイグレーションの実行
```bash
supabase db push
```

### 2. 新規APIキー発行時の推奨関数
```sql
-- 推奨：統一関数を使用
SELECT issue_api_key(
    p_user_id := 'user-uuid',
    p_name := 'My API Key',
    p_tier := 'free'
);
```

### 3. Edge Functions側の確認事項
- 現在のEdge Functionsは`verify_api_key_hash` RPCを呼び出すだけなので変更不要
- bcryptインポートは不要（データベース側で処理）

## ✅ チェックリスト

- [x] 既存システムの調査完了
- [x] bcrypt対応状況の確認
- [x] MD5使用関数の特定
- [x] マイグレーションファイル作成
- [x] テストスクリプト作成
- [x] ドキュメント作成
- [ ] 本番環境へのマイグレーション適用
- [ ] 動作確認

## 📝 注意事項

1. **既存キーへの影響なし**: 全キーが既にbcryptなので移行不要
2. **後方互換性**: `verify_api_key_hash`はbcryptハッシュを正しく処理
3. **Edge Functions変更不要**: RPC経由なのでそのまま動作

## 🎯 結論

システムは既にほぼbcryptに移行済みでした。残っていたMD5使用の`create_api_key`関数を修正し、統一された`issue_api_key`関数を追加することで、完全なbcrypt化を達成しました。

---

**作成者**: XBRL財務APIシステム開発チーム
**最終更新**: 2025-01-28