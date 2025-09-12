-- ============================================
-- データベース簡略化スクリプト
-- ============================================
-- レート制限関連のテーブルを削除し、シンプルな構造にする
-- ============================================

-- 1. レート制限関連テーブルを削除
DROP TABLE IF EXISTS api_key_usage_logs CASCADE;
DROP TABLE IF EXISTS api_key_rate_limits CASCADE;
DROP VIEW IF EXISTS api_key_usage_summary CASCADE;

-- 2. api_keysテーブルを簡略化（既存を削除して再作成）
DROP TABLE IF EXISTS api_keys CASCADE;

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL DEFAULT 'API Key',
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);

-- 3. RLSポリシー
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のAPIキーのみ操作可能
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
CREATE POLICY "Users can view own API keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own API keys" ON api_keys;
CREATE POLICY "Users can create own API keys" ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
CREATE POLICY "Users can update own API keys" ON api_keys
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own API keys" ON api_keys;
CREATE POLICY "Users can delete own API keys" ON api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- 4. 確認
SELECT 
    'Database simplified!' as status,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN ('api_keys', 'companies', 'markdown_files_metadata')) as essential_tables,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN ('api_key_rate_limits', 'api_key_usage_logs')) as removed_tables;