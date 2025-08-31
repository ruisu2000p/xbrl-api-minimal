# Edge Functions デプロイ手順

## 1. Supabaseダッシュボードでデプロイ

### v1_filings関数のデプロイ

1. [Supabase Dashboard](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/functions) にアクセス
2. "New Function" をクリック
3. 関数名: `v1_filings`
4. 以下のコードを貼り付け:

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, preflight, authenticateApiKey, checkRateLimit } from "../_shared/utils.ts";

serve(async (req) => {
  // Handle CORS preflight
  const pf = preflight(req);
  if (pf) return pf;

  try {
    // Authenticate API key
    const authResult = await authenticateApiKey(req.headers);
    if (!authResult.ok) {
      return new Response(
        JSON.stringify(authResult.body),
        { 
          status: authResult.status,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders() 
          }
        }
      );
    }

    // Check rate limit
    const rateResult = await checkRateLimit(authResult.keyId, authResult.rateLimits);
    if (!rateResult.ok) {
      return new Response(
        JSON.stringify(rateResult.body),
        { 
          status: rateResult.status,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders() 
          }
        }
      );
    }

    // Return sample data for now
    return new Response(
      JSON.stringify({
        success: true,
        message: "Filings API v1",
        user_id: authResult.userId,
        plan: authResult.plan,
        data: {
          filings: [
            { id: 1, company: "Sample Corp", date: "2024-01-01" }
          ]
        }
      }),
      { 
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders() 
        }
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders() 
        }
      }
    );
  }
});
```

5. **重要**: "JWT Verification" を **Disable** に設定
6. "Deploy" をクリック

### keys_issue関数の確認

1. `keys_issue` 関数が既にデプロイされているか確認
2. もし更新が必要な場合は、`supabase/functions/keys_issue/index.ts` のコードで更新

## 2. 環境変数の設定

Supabaseダッシュボード > Functions > Settings で以下を設定:

```
KEY_PEPPER=37s4DQwo0C0rtwxypynFpVgTq5Wvg/jMpX2o6qGHHK8=
```

## 3. データベースの準備

SQL Editorで以下を実行（まだ実行していない場合）:

```sql
-- Create composite index for faster API key lookups
create index if not exists idx_api_keys_prefix_hash 
on public.api_keys(key_prefix, key_hash);

-- Create atomic increment function
CREATE OR REPLACE FUNCTION incr_usage_and_get(p_key_id text)
RETURNS TABLE (
  minute_count bigint,
  hour_count bigint,
  day_count bigint
) AS $$
BEGIN
  -- Upsert and increment counters
  INSERT INTO public.api_usage (
    key_id,
    minute_window,
    hour_window,
    day_window,
    minute_count,
    hour_count,
    day_count
  ) VALUES (
    p_key_id,
    date_trunc('minute', now()),
    date_trunc('hour', now()),
    date_trunc('day', now()),
    1,
    1,
    1
  )
  ON CONFLICT (key_id) DO UPDATE SET
    minute_count = CASE 
      WHEN api_usage.minute_window = date_trunc('minute', now()) 
      THEN api_usage.minute_count + 1 
      ELSE 1 
    END,
    hour_count = CASE 
      WHEN api_usage.hour_window = date_trunc('hour', now()) 
      THEN api_usage.hour_count + 1 
      ELSE 1 
    END,
    day_count = CASE 
      WHEN api_usage.day_window = date_trunc('day', now()) 
      THEN api_usage.day_count + 1 
      ELSE 1 
    END,
    minute_window = date_trunc('minute', now()),
    hour_window = date_trunc('hour', now()),
    day_window = date_trunc('day', now());

  -- Return current counts
  RETURN QUERY
  SELECT 
    api_usage.minute_count,
    api_usage.hour_count,
    api_usage.day_count
  FROM public.api_usage
  WHERE key_id = p_key_id;
END;
$$ LANGUAGE plpgsql;
```

## 4. テスト手順

### テストユーザーの作成

1. Supabaseダッシュボード > Authentication > Users
2. "Add User" をクリック
3. Email: `test@example.com`
4. Password: `Test1234!`
5. "Create User" をクリック

### APIキーの発行テスト

```bash
# 1. ユーザーログインしてトークン取得
curl -X POST "https://wpwqxhyiglbtlaimrjrx.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <YOUR_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# 2. 取得したaccess_tokenを使ってAPIキー発行
curl -X POST "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/keys_issue" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json"

# 3. 発行されたAPIキーでv1_filingsを呼び出し
curl "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/v1_filings" \
  -H "x-api-key: <issued_api_key>"
```

## 5. 確認事項

- [ ] KEY_PEPPER環境変数が設定されている
- [ ] api_keys テーブルが存在する
- [ ] api_usage テーブルが存在する
- [ ] incr_usage_and_get 関数が存在する
- [ ] v1_filings のJWT検証が無効化されている
- [ ] keys_issue が正常に動作する
- [ ] HMAC-SHA256でハッシュ化されている

## トラブルシューティング

### "Missing authorization header" エラー
→ JWT検証が有効なまま。Dashboardで無効化を確認

### "Invalid API key" エラー
→ ハッシュ方式の不一致。両関数でHMAC-SHA256を使用しているか確認

### "KEY_PEPPER environment variable not set" エラー
→ 環境変数が設定されていない。Functions > Settings で設定

### レート制限エラー
→ api_usage テーブルとincr_usage_and_get関数が存在するか確認