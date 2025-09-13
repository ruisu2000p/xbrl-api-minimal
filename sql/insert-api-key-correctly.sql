-- ================================================
-- APIキーを正しく登録するSQL
-- ================================================

-- 1. まずデモユーザーを作成
INSERT INTO users (email, name)
VALUES ('demo@example.com', 'Demo User')
ON CONFLICT (email) DO NOTHING;

-- 2. APIキーを登録（ハッシュ化して保存）
DO $$
DECLARE
    v_user_id UUID;
    v_api_key TEXT := 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830';
    v_key_prefix TEXT;
    v_key_suffix TEXT;
    v_key_hash TEXT;
BEGIN
    -- デモユーザーのIDを取得
    SELECT id INTO v_user_id FROM users WHERE email = 'demo@example.com' LIMIT 1;
    
    IF v_user_id IS NULL THEN
        -- ユーザーが存在しない場合は作成
        INSERT INTO users (email, name)
        VALUES ('demo@example.com', 'Demo User')
        RETURNING id INTO v_user_id;
    END IF;
    
    -- APIキーをプレフィックスとサフィックスに分割
    v_key_prefix := substring(v_api_key, 1, 10);  -- 最初の10文字
    v_key_suffix := substring(v_api_key, length(v_api_key) - 5);  -- 最後の6文字
    
    -- ハッシュ化（SHA256を使用）
    v_key_hash := encode(digest(v_api_key, 'sha256'), 'hex');
    
    -- APIキーを挿入または更新
    INSERT INTO api_keys (
        id,
        key_hash,
        key_prefix,
        key_suffix,
        user_id,
        is_active,
        status,
        created_at,
        expires_at,
        name,
        description,
        environment,
        tier,
        permissions,
        metadata
    )
    VALUES (
        gen_random_uuid(),
        v_key_hash,
        v_key_prefix,
        v_key_suffix,
        v_user_id,
        true,
        'active',
        now(),
        now() + interval '1 year',
        'Production API Key',
        'XBRL Financial Data API Access',
        'production',
        'pro',
        '{"read": true, "write": false, "admin": false}'::jsonb,
        jsonb_build_object(
            'original_key_identifier', 'xbrl_live_12b1a...',
            'created_by', 'system_admin',
            'purpose', 'Claude Desktop MCP Integration'
        )
    )
    ON CONFLICT (key_hash) DO UPDATE
    SET 
        is_active = true,
        status = 'active',
        user_id = v_user_id,
        expires_at = now() + interval '1 year',
        updated_at = now();
    
    RAISE NOTICE 'API key registered successfully';
    RAISE NOTICE 'Key prefix: %', v_key_prefix;
    RAISE NOTICE 'Key suffix: %', v_key_suffix;
    RAISE NOTICE 'Key hash: %', v_key_hash;
END $$;

-- 3. 確認クエリ
SELECT 
    'API Key Registration Status' as check_type,
    key_prefix || '...' || key_suffix as key_display,
    u.email as user_email,
    ak.is_active,
    ak.status,
    ak.tier,
    ak.expires_at,
    ak.name,
    ak.environment
FROM api_keys ak
JOIN users u ON ak.user_id = u.id
WHERE ak.key_prefix = 'xbrl_live_'
ORDER BY ak.created_at DESC
LIMIT 1;

-- 4. APIキー検証関数の作成（アプリケーションで使用）
CREATE OR REPLACE FUNCTION verify_api_key(p_api_key TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    user_id UUID,
    tier TEXT,
    permissions JSONB
) AS $$
DECLARE
    v_key_hash TEXT;
    v_key_prefix TEXT;
    v_key_suffix TEXT;
BEGIN
    -- APIキーをハッシュ化
    v_key_hash := encode(digest(p_api_key, 'sha256'), 'hex');
    v_key_prefix := substring(p_api_key, 1, 10);
    v_key_suffix := substring(p_api_key, length(p_api_key) - 5);
    
    -- APIキーを検証
    RETURN QUERY
    SELECT 
        CASE 
            WHEN ak.id IS NOT NULL 
                AND ak.is_active = true 
                AND ak.status = 'active'
                AND (ak.expires_at IS NULL OR ak.expires_at > now())
            THEN true
            ELSE false
        END as is_valid,
        ak.user_id,
        ak.tier,
        ak.permissions
    FROM api_keys ak
    WHERE ak.key_hash = v_key_hash
        AND ak.key_prefix = v_key_prefix
        AND ak.key_suffix = v_key_suffix
    LIMIT 1;
    
    -- 使用履歴を更新
    IF FOUND THEN
        UPDATE api_keys 
        SET 
            last_used_at = now(),
            total_requests = COALESCE(total_requests, 0) + 1,
            successful_requests = COALESCE(successful_requests, 0) + 1
        WHERE key_hash = v_key_hash;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. APIキーの検証テスト
SELECT * FROM verify_api_key('xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830');