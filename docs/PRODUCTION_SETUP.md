# 本番環境セットアップガイド

## 1. 環境変数の設定（Vercelダッシュボード）

### 必須環境変数
```
NEXT_PUBLIC_SUPABASE_URL = https://zxzyidqrvzfzhicfuhlo.supabase.co
SUPABASE_SERVICE_ROLE_KEY = [SERVICE_KEY]
NODE_ENV = production
```

### セキュリティ設定
```
CORS_ALLOWED_ORIGINS = https://yourdomain.com,https://app.yourdomain.com
API_RATE_LIMIT = 1000
API_RATE_LIMIT_WINDOW = 3600000
```

## 2. Supabase設定

### a. Row Level Security (RLS) 有効化
```sql
-- companiesテーブルのRLSを有効化
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 読み取り専用ポリシーを作成
CREATE POLICY "Enable read access for authenticated users" ON companies
    FOR SELECT
    USING (true);
```

### b. APIキー管理テーブル
```sql
-- APIキー管理テーブル（既存）
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0
);

-- レート制限テーブル
CREATE TABLE IF NOT EXISTS api_key_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    requests_per_hour INTEGER DEFAULT 1000,
    requests_per_day INTEGER DEFAULT 10000,
    current_hour_count INTEGER DEFAULT 0,
    current_day_count INTEGER DEFAULT 0,
    last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 使用ログテーブル
CREATE TABLE IF NOT EXISTS api_key_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_status ON api_keys(status);
CREATE INDEX idx_api_key_usage_logs_created_at ON api_key_usage_logs(created_at);
CREATE INDEX idx_api_key_usage_logs_api_key_id ON api_key_usage_logs(api_key_id);
```

## 3. 本番用APIキー生成スクリプト

create-production-api-key.js:
```javascript
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createProductionApiKey(name, userId) {
  // APIキー生成
  const apiKey = `xbrl_prod_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  // データベースに保存
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      key_hash: keyHash,
      user_id: userId,
      name: name,
      status: 'active',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1年後
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating API key:', error);
    return null;
  }
  
  // レート制限設定
  await supabase
    .from('api_key_rate_limits')
    .insert({
      api_key_id: data.id,
      requests_per_hour: 1000,
      requests_per_day: 10000
    });
  
  return {
    apiKey, // これは一度だけ表示される
    keyId: data.id,
    expiresAt: data.expires_at
  };
}
```

## 4. 本番用コード更新

### a. APIキー検証強化（app/api/v1/companies/route.ts）
```typescript
import crypto from 'crypto';

async function validateApiKey(apiKey: string | null): Promise<boolean> {
  if (!apiKey) return false;
  
  // テスト用キーのブロック
  if (apiKey === 'xbrl_live_test_admin_key_2025') {
    return process.env.NODE_ENV !== 'production';
  }
  
  // 本番APIキーの検証
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('status', 'active')
    .single();
  
  if (error || !data) return false;
  
  // 有効期限チェック
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return false;
  }
  
  // 使用回数を記録
  await supabase
    .from('api_keys')
    .update({ 
      last_used_at: new Date().toISOString(),
      total_requests: data.total_requests + 1
    })
    .eq('id', data.id);
  
  return true;
}
```

### b. レート制限実装
```typescript
async function checkRateLimit(apiKeyId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('api_key_rate_limits')
    .select('*')
    .eq('api_key_id', apiKeyId)
    .single();
  
  if (error || !data) return false;
  
  const now = new Date();
  const lastReset = new Date(data.last_reset_at);
  const hoursDiff = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
  
  // 1時間経過したらリセット
  if (hoursDiff >= 1) {
    await supabase
      .from('api_key_rate_limits')
      .update({
        current_hour_count: 1,
        last_reset_at: now.toISOString()
      })
      .eq('api_key_id', apiKeyId);
    return true;
  }
  
  // レート制限チェック
  if (data.current_hour_count >= data.requests_per_hour) {
    return false;
  }
  
  // カウンター更新
  await supabase
    .from('api_key_rate_limits')
    .update({
      current_hour_count: data.current_hour_count + 1
    })
    .eq('api_key_id', apiKeyId);
  
  return true;
}
```

## 5. デプロイ手順

### a. Vercelダッシュボード
1. Settings → Environment Variables で環境変数設定
2. NODE_ENV を production に設定
3. Deploymentsタブから本番デプロイ実行

### b. デプロイコマンド
```bash
# 本番ブランチにマージ
git checkout main
git pull origin main

# タグ付け
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0

# Vercelが自動デプロイを実行
```

## 6. 監視設定

### a. ヘルスチェックエンドポイント
```typescript
// app/api/health/route.ts
export async function GET() {
  const { count } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });
  
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      connected: count !== null,
      companies: count
    }
  });
}
```

### b. ログ監視
- Vercel Analytics を有効化
- Supabaseダッシュボードでクエリパフォーマンス監視
- APIキー使用状況の定期レポート

## 7. バックアップ設定

### a. データベースバックアップ
```bash
# Supabase CLIでバックアップ
supabase db dump -p [PROJECT_ID] > backup_$(date +%Y%m%d).sql
```

### b. 定期バックアップスケジュール
- 日次: データベーススナップショット
- 週次: フルバックアップ
- 月次: アーカイブ保存

## 8. セキュリティチェックリスト

- [ ] テスト用APIキーを無効化
- [ ] CORS設定を本番ドメインのみに制限
- [ ] RLSポリシーを有効化
- [ ] SSL証明書の確認
- [ ] レート制限の実装
- [ ] APIキー有効期限の設定
- [ ] ログ記録の有効化
- [ ] エラーハンドリングの確認
- [ ] 環境変数の暗号化確認
- [ ] バックアップスケジュールの設定

## 9. 本番URL

```
API Endpoint: https://xbrl-api-minimal.vercel.app/api/v1/companies
Health Check: https://xbrl-api-minimal.vercel.app/api/health
Documentation: https://xbrl-api-minimal.vercel.app/docs
```

## 10. サポート連絡先

技術的な問題が発生した場合：
- GitHub Issues: https://github.com/ruisu2000p/xbrl-api-minimal/issues
- Email: support@yourdomain.com