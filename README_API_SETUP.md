# XBRL API セットアップガイド

## 📋 現在の状況

### ✅ 完了済み
1. **Supabase Functions作成**
   - `keys_issue` - APIキー発行機能
   - `v1_filings` - 企業データ取得API
   - CORS対応済み

2. **デプロイ完了**
   - プロジェクト: `zxzyidqrvzfzhicfuhlo`
   - Functions URL: https://zxzyidqrvzfzhicfuhlo.supabase.co/functions/v1/

3. **MCPサーバー作成**
   - `mcp-server-supabase.mjs` - Supabase直接接続版
   - Claude Desktopから利用可能

## 🔧 必要な設定

### 1. Supabaseダッシュボードから取得が必要
1. [Supabaseダッシュボード](https://app.supabase.com/project/zxzyidqrvzfzhicfuhlo)にログイン
2. Settings → API から以下を取得：
   - `anon` public key
   - `service_role` key (秘密)

### 2. データベーステーブルの作成
```sql
-- api_keys table
CREATE TABLE api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  key_suffix text NOT NULL,
  masked_key text NOT NULL,
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone,
  rate_limit_per_minute integer DEFAULT 100,
  rate_limit_per_hour integer DEFAULT 10000,
  rate_limit_per_day integer DEFAULT 100000,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- usage_counters table
CREATE TABLE usage_counters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid REFERENCES api_keys(id),
  minute_count integer DEFAULT 0,
  hour_count integer DEFAULT 0,
  day_count integer DEFAULT 0,
  total_count bigint DEFAULT 0,
  last_reset_minute timestamp with time zone DEFAULT now(),
  last_reset_hour timestamp with time zone DEFAULT now(),
  last_reset_day timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- incr_usage function
CREATE OR REPLACE FUNCTION incr_usage(key_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE usage_counters
  SET 
    minute_count = minute_count + 1,
    hour_count = hour_count + 1,
    day_count = day_count + 1,
    total_count = total_count + 1,
    updated_at = now()
  WHERE api_key_id = key_id;
END;
$$ LANGUAGE plpgsql;
```

## 🧪 テスト方法

### 方法1: HTMLテストページ
```bash
cd C:\Users\pumpk\xbrl-api-minimal
start test-api-frontend.html
```

### 方法2: コマンドライン
```bash
# 1. ユーザー作成
curl -X POST https://zxzyidqrvzfzhicfuhlo.supabase.co/auth/v1/signup \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# 2. APIキー発行（access_tokenを使用）
curl -X POST https://zxzyidqrvzfzhicfuhlo.supabase.co/functions/v1/keys_issue \
  -H "Authorization: Bearer ACCESS_TOKEN"

# 3. API使用
curl https://zxzyidqrvzfzhicfuhlo.supabase.co/functions/v1/v1_filings?limit=5 \
  -H "x-api-key: YOUR_API_KEY"
```

## 📁 ファイル構成

```
xbrl-api-minimal/
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   └── utils.ts          # 共通ユーティリティ（CORS、認証等）
│   │   ├── keys_issue/
│   │   │   └── index.ts          # APIキー発行
│   │   └── v1_filings/
│   │       └── index.ts          # データ取得API
│   └── config.toml               # Supabase設定
├── mcp-server/
│   └── mcp-server-supabase.mjs   # Claude Desktop用MCPサーバー
├── test-api-frontend.html        # ブラウザテストページ
├── test-api-direct.js            # Node.jsテストスクリプト
└── deploy-functions.bat          # デプロイスクリプト
```

## 🚀 次のステップ

1. **Supabaseダッシュボード**で上記のテーブルとRPC関数を作成
2. **APIキーを更新**（anon key, service role key）
3. **テストユーザー作成**してAPIキー発行
4. **API動作確認**

## 📝 注意事項

- Service Role Keyは絶対に公開しない（バックエンドのみで使用）
- Anon Keyはフロントエンドで使用可能
- APIキーは発行時のみ表示される（保存必須）
- レート制限: 100回/分、10,000回/時、100,000回/日

## 🔗 関連リンク

- [Supabase Dashboard](https://app.supabase.com/project/zxzyidqrvzfzhicfuhlo)
- [Functions Dashboard](https://app.supabase.com/project/zxzyidqrvzfzhicfuhlo/functions)
- [Database Tables](https://app.supabase.com/project/zxzyidqrvzfzhicfuhlo/editor)