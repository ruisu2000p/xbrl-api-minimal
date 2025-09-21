# APIキー検証の修正方法

## 現在の問題
- APIキー生成時とVercelでの検証時で異なる`API_KEY_SECRET`が使用されている
- データベースのハッシュとVercelで生成されるハッシュが一致しない

## 解決方法

### オプション1: Vercelに環境変数を設定（即座の解決）

1. https://vercel.com/aas-projects-49d0d7ef/xbrl-api-minimal/settings/environment-variables にアクセス
2. 以下の環境変数を追加：
   - Name: `API_KEY_SECRET`
   - Value: APIキー生成時に使用したシークレット（最低32文字）
   - Environment: Production, Preview, Development

### オプション2: Supabase側で完結させる（推奨）

新しい関数を作成：
```sql
CREATE OR REPLACE FUNCTION public.verify_api_key(api_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  key_hash text;
  key_data jsonb;
BEGIN
  -- ここでハッシュ化（シークレットはSupabase側で管理）
  key_hash := encode(digest(api_key || current_setting('app.api_secret'), 'sha256'), 'hex');

  -- APIキー情報を取得
  SELECT
    jsonb_build_object(
      'valid', true,
      'user_id', user_id,
      'tier', tier,
      'rate_limit_per_minute', rate_limit_per_minute
    )
  INTO key_data
  FROM api_keys
  WHERE api_keys.key_hash = key_hash
    AND api_keys.is_active = true
    AND (api_keys.expires_at IS NULL OR api_keys.expires_at > NOW());

  IF key_data IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  -- 使用記録を更新
  UPDATE api_keys
  SET last_used_at = NOW()
  WHERE key_hash = key_hash;

  RETURN key_data;
END;
$function$;
```

## テスト用の一時的な解決策

APIキーを再生成して、既知のシークレットでハッシュ化：

```javascript
// test-generate-key.js
const crypto = require('crypto');

const apiKey = 'xbrl_live_cHi3JVb6waLQ4WEqY7v3OzlkEN8K8iMF';
const secret = 'your-known-secret-key-minimum-32-characters-long';
const hash = crypto.createHmac('sha256', secret).update(apiKey).digest('hex');

console.log('Update in Supabase:');
console.log(`UPDATE api_keys SET key_hash = '${hash}' WHERE name = 'Test API Key';`);
```

## 長期的な推奨事項

1. **セキュリティ分離**: APIキーの検証はSupabase側で完結させる
2. **Vercelの役割**: UIとリクエストの中継のみ
3. **シークレット管理**: `API_KEY_SECRET`はSupabaseのみに保持

これにより、フロントエンドとバックエンドの責任が明確に分離され、セキュリティが向上します。