# Debug Auth Function デプロイ手順

## 目的
v1_filingsでAPIキー認証が失敗する原因を特定するためのデバッグ用Edge Function

## デプロイ手順

1. **Supabase Dashboard**にアクセス
   https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/functions

2. **新しい関数を作成**
   - "New Function" をクリック
   - 関数名: `debug_auth`
   - JWT Verification: **Disable**（無効化）

3. **コードを貼り付け**
   `supabase/functions/debug_auth/index.ts` の内容をコピー＆ペースト

4. **Deploy**をクリック

## テスト方法

```bash
# デバッグ関数を呼び出し
curl -X POST "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/debug_auth" \
  -H "x-api-key: xbrl_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd" \
  -H "Content-Type: application/json"
```

## 期待される出力

```json
{
  "debug_info": {
    "provided_key": "xbrl_live_0123456789...",
    "extracted_prefix": "xbrl_live",
    "calculated_hash": "550b044b9e23137984aaf190f05117091b725432c37ee8eddbcc165663490fd8",
    "key_pepper_set": true,
    "key_pepper_length": 44,
    "key_pepper_preview": "37s4DQwo0C..."
  },
  "database_lookup": {
    "found": true,
    "result": [...]
  },
  "expected_values": {
    "hash_matches": true
  }
}
```

## チェックポイント

1. **KEY_PEPPER環境変数**が設定されているか
2. **計算されたハッシュ**が期待値と一致するか
3. **データベース検索**が成功するか
4. **プレフィックス抽出**が正しいか

## トラブルシューティング

### KEY_PEPPERが設定されていない場合
Functions > Settings > Secrets で以下を追加：
```
KEY_PEPPER=37s4DQwo0C0rtwxypynFpVgTq5Wvg/jMpX2o6qGHHK8=
```

### ハッシュが一致しない場合
- KEY_PEPPERの値が正しいか確認
- Base64デコードが正しく動作しているか確認

### データベース検索が失敗する場合
- api_keysテーブルにレコードが存在するか確認
- RLSポリシーが適切に設定されているか確認