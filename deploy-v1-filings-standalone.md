# v1_filings Standalone デプロイ手順

## 概要
_shared/utils.tsの依存関係の問題を回避するため、スタンドアロン版のv1_filings関数をデプロイします。

## デプロイ手順

### 1. 既存のv1_filings関数を更新

1. **Supabase Dashboard**にアクセス
   https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/functions

2. **v1_filings関数を選択**
   - 既存の`v1_filings`関数をクリック

3. **コードを更新**
   - 全コードを削除
   - `supabase/functions/v1_filings_standalone/index.ts`の内容をコピー＆ペースト

4. **設定確認**
   - JWT Verification: **Disabled**（無効）になっていることを確認

5. **Deploy**をクリック

### 2. テスト

```bash
# テストAPIキーで呼び出し
curl -i "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/v1_filings" \
  -H "x-api-key: xbrl_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd"
```

## 期待される成功レスポンス

```json
{
  "success": true,
  "message": "Filings API v1 - Standalone",
  "user_id": "test_user_123",
  "data": {
    "filings": [
      {
        "id": 1,
        "company": "Sample Corp",
        "date": "2024-01-01",
        "type": "Annual Report"
      },
      {
        "id": 2,
        "company": "Test Inc",
        "date": "2024-02-01",
        "type": "Quarterly Report"
      }
    ],
    "total": 2,
    "page": 1,
    "limit": 10
  }
}
```

## スタンドアロン版の特徴

1. **外部依存なし**
   - _shared/utils.tsを使用しない
   - すべての関数を内部に実装

2. **完全な機能**
   - APIキー認証
   - HMAC-SHA256ハッシュ
   - データベース検索
   - 有効期限チェック
   - 使用状況トラッキング（簡易版）

3. **詳細なエラーメッセージ**
   - より具体的なエラー情報
   - デバッグしやすい

## トラブルシューティング

### まだ403エラーが出る場合

1. **Functions > Logs**でエラーログを確認
2. **KEY_PEPPER環境変数**が設定されているか確認
3. **データベースのレコード**を再確認

### 500エラーが出る場合

1. **Supabase Service Role Key**が正しいか確認
2. **データベーステーブル**が存在するか確認
3. **RLSポリシー**が適切か確認

## 確認事項

- [ ] v1_filings関数のコードを更新した
- [ ] JWT検証が無効になっている
- [ ] KEY_PEPPER環境変数が設定されている
- [ ] api_keysテーブルにテストレコードがある
- [ ] テストAPIキーでアクセスできる