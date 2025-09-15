# ChatGPTレビューフィードバック実装タスク

## 優先度: 高（即座に実装すべき）

### 1. セキュリティ強化 🔐

#### 1.1 定数時間比較の実装
```typescript
// Edge Functions内でのAPIキー比較を定数時間に
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

#### 1.2 バーストレート制限の追加
```sql
-- 10秒間のバースト制限を追加
ALTER TABLE api_usage_logs ADD COLUMN burst_window_start TIMESTAMP;
ALTER TABLE api_usage_logs ADD COLUMN burst_count INTEGER DEFAULT 0;

-- バースト制限チェック関数
CREATE OR REPLACE FUNCTION check_burst_limit(
  p_api_key_id UUID,
  p_burst_limit INTEGER DEFAULT 10,
  p_window_seconds INTEGER DEFAULT 10
) RETURNS BOOLEAN AS $$
-- 実装内容
$$ LANGUAGE plpgsql;
```

#### 1.3 エラーフォーマットの標準化
```typescript
// shared/errors.ts として実装
interface StandardError {
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
}

export function createErrorResponse(
  error: string,
  code?: string,
  details?: any
): Response {
  return new Response(
    JSON.stringify({
      error,
      code,
      details,
      timestamp: new Date().toISOString()
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### 2. パフォーマンス最適化 ⚡

#### 2.1 全文検索インデックスの追加
```sql
-- companies テーブルに全文検索インデックス追加
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_companies_name_trgm ON companies
  USING gin (company_name gin_trgm_ops);

-- 検索関数を最適化
CREATE OR REPLACE FUNCTION search_companies_optimized(
  search_term TEXT,
  similarity_threshold FLOAT DEFAULT 0.3
) RETURNS TABLE (...) AS $$
  SELECT * FROM companies
  WHERE company_name % search_term
  AND similarity(company_name, search_term) > similarity_threshold
  ORDER BY similarity(company_name, search_term) DESC;
$$ LANGUAGE sql;
```

#### 2.2 共通ロジックの抽出
```typescript
// supabase/functions/_shared/utils.ts
export { corsHeaders } from './cors.ts';

export async function verifyApiKey(
  supabase: SupabaseClient,
  apiKey: string
): Promise<ApiKeyData | null> {
  // 共通認証ロジック
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  apiKeyId: string,
  tier: string
): Promise<boolean> {
  // 共通レート制限チェック
}

export function createStandardResponse(
  data: any,
  status: number = 200
): Response {
  // 標準レスポンス生成
}
```

#### 2.3 コールドスタート対策
```typescript
// supabase/functions/warmer/index.ts
// 定期的にping送信してウォームに保つ
Deno.serve(async () => {
  const functions = ['search-companies', 'query-my-data', 'get-storage-md'];

  for (const func of functions) {
    await fetch(`${SUPABASE_URL}/functions/v1/${func}/health`);
  }

  return new Response('Functions warmed', { status: 200 });
});
```

## 優先度: 中（次のスプリントで実装）

### 3. モニタリング強化 📊

#### 3.1 ログドレインの設定
```typescript
// supabase/functions/_shared/logging.ts
export async function logToExternal(
  level: 'info' | 'warn' | 'error',
  message: string,
  metadata?: any
) {
  // Logflare/Axiom へのログ送信
  await fetch(LOG_DRAIN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOG_DRAIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      level,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      function_name: Deno.env.get('FUNCTION_NAME')
    })
  });
}
```

#### 3.2 セキュリティイベントの自動アラート
```sql
-- セキュリティアラート用トリガー
CREATE OR REPLACE FUNCTION notify_security_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity >= 'high' THEN
    PERFORM pg_notify(
      'security_alert',
      json_build_object(
        'event_type', NEW.event_type,
        'severity', NEW.severity,
        'user_id', NEW.user_id,
        'details', NEW.details
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER security_alert_trigger
AFTER INSERT ON security_events
FOR EACH ROW EXECUTE FUNCTION notify_security_alert();
```

### 4. キャッシング戦略 💾

#### 4.1 CDNヘッダーの最適化
```typescript
// Edge Functions内でキャッシュヘッダー設定
const cacheHeaders = {
  // 静的コンテンツ用
  'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
  // 動的コンテンツ用
  'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
};
```

#### 4.2 Denoキャッシュの活用
```typescript
// メモリキャッシュの実装
const cache = new Map<string, { data: any; expires: number }>();

export function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

export function setCached(key: string, data: any, ttl: number = 300000) {
  cache.set(key, { data, expires: Date.now() + ttl });
}
```

## 優先度: 低（将来的な改善）

### 5. 災害復旧とHA 🔄

#### 5.1 バックアップ自動化
```bash
#!/bin/bash
# scripts/backup.sh
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
supabase db dump > backups/db_backup_$TIMESTAMP.sql
supabase storage cp -r / backups/storage_$TIMESTAMP/
```

#### 5.2 復旧手順書の作成
- [ ] RTO/RPO目標の定義
- [ ] バックアップからの復元手順
- [ ] フェイルオーバー手順
- [ ] データ整合性チェック手順

### 6. 将来的な拡張 🚀

#### 6.1 GraphQL導入検討
- PostgRESTの制限を超える複雑なクエリが必要な場合
- Hasuraまたはカスタム実装の評価

#### 6.2 WebSocketサポート
```typescript
// Supabase Realtimeの活用
const channel = supabase
  .channel('financial-updates')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'markdown_files_metadata' },
    (payload) => console.log('New document:', payload)
  )
  .subscribe();
```

## 実装順序の推奨

### Phase 1（今週）
1. ✅ エラーフォーマットの標準化
2. ✅ 共通ロジックの抽出
3. ✅ 定数時間比較の実装

### Phase 2（来週）
4. ⏳ 全文検索インデックス追加
5. ⏳ バーストレート制限
6. ⏳ コールドスタート対策

### Phase 3（次スプリント）
7. ⏳ ログドレイン設定
8. ⏳ セキュリティアラート
9. ⏳ CDNキャッシング最適化

### Phase 4（Q2）
10. ⏳ 災害復旧計画
11. ⏳ GraphQL/WebSocket評価

## 測定指標

実装後に以下のメトリクスを測定：

- **レスポンスタイム**: P50 < 100ms, P99 < 500ms
- **エラー率**: < 0.1%
- **稼働率**: > 99.9%
- **コールドスタート**: < 300ms
- **同時接続数**: > 200

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| RLSによるクエリ遅延 | 高 | インデックス最適化、クエリプラン監視 |
| コールドスタート | 中 | ウォーマー関数、リージョン最適化 |
| ペッパー漏洩 | 高 | 環境変数管理、定期ローテーション |
| バースト攻撃 | 中 | レート制限強化、WAF導入検討 |

---

このタスクリストに基づいて、優先度の高いものから順次実装していきます。