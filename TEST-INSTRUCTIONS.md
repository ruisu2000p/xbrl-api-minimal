# APIテスト手順

## プロジェクト情報
- **Project ID**: wpwqxhyiglbtlaimrjrx
- **URL**: https://wpwqxhyiglbtlaimrjrx.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx

## 現在の状況
- ✅ JWT検証は無効化済み（v1_filingsが`x-api-key`を認識）
- ✅ HMAC-SHA256ハッシュ実装済み
- ✅ KEY_PEPPER環境変数設定済み
- ⚠️ データベーステーブルの作成が必要

## テスト手順

### 1. データベース準備

Supabase SQL Editorで以下を実行：

1. **スキーマ作成** (`sql/complete-schema.sql`)
   - api_keysテーブル
   - api_usageテーブル
   - incr_usage_and_get関数
   - インデックス作成

2. **テストデータ挿入** (`sql/insert-test-key.sql`)
   - テスト用APIキーのレコード作成

### 2. APIテスト

```bash
# テスト用APIキー
TEST_KEY="xbrl_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd"

# v1_filingsエンドポイントテスト
curl -i "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/v1_filings" \
  -H "x-api-key: $TEST_KEY"
```

### 3. 期待される結果

成功時のレスポンス：
```json
{
  "success": true,
  "message": "Filings API v1",
  "user_id": "test_user_123",
  "plan": "free",
  "data": {
    "filings": [
      { "id": 1, "company": "Sample Corp", "date": "2024-01-01" }
    ]
  }
}
```

## テストスクリプト

### 基本テスト
```bash
node test-manual-key.js
```

### APIフローテスト（ユーザー認証が必要）
```bash
node test-api-flow.js
```

## トラブルシューティング

### "Invalid or expired API key"エラー
1. api_keysテーブルにレコードが存在するか確認
2. key_hashが正しいか確認（HMAC-SHA256で計算）
3. KEY_PEPPER環境変数が正しいか確認

### "insert failed"エラー
1. api_keysテーブルが存在するか確認
2. 必要なカラムがすべて存在するか確認
3. RLSポリシーが適切に設定されているか確認

## 重要な値

### KEY_PEPPER（環境変数）
```
37s4DQwo0C0rtwxypynFpVgTq5Wvg/jMpX2o6qGHHK8=
```

### テストAPIキー
```
xbrl_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd
```

### 計算済みHMAC-SHA256ハッシュ
```
550b044b9e23137984aaf190f05117091b725432c37ee8eddbcc165663490fd8
```

## 次のステップ

1. **SQL実行**: Supabase SQL Editorで`complete-schema.sql`と`insert-test-key.sql`を実行
2. **テスト実行**: `node test-manual-key.js`でAPIキー認証をテスト
3. **成功確認**: 200 OKレスポンスが返ることを確認
4. **本番デプロイ**: keys_issue関数の修正とデプロイ