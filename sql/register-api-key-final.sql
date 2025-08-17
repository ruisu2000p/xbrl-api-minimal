-- ================================================
-- APIキーを管理者アカウントに紐付けて登録
-- ================================================

-- 1. 管理者アカウントの確認
SELECT 
    'Admin User Check' as status,
    id,
    email,
    name,
    role,
    subscription_plan
FROM users 
WHERE email = 'admin@xbrl-api.com';

-- 2. APIキーを管理者アカウントに紐付けて登録
DO $$
DECLARE
    v_admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
    v_api_key TEXT := 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830';
    v_key_prefix TEXT;
    v_key_suffix TEXT;
    v_key_hash TEXT;
BEGIN
    -- APIキーの部分文字列を抽出
    v_key_prefix := substring(v_api_key, 1, 10);  -- xbrl_live_
    v_key_suffix := substring(v_api_key, length(v_api_key) - 5);  -- d80830
    
    -- SHA256ハッシュ化
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
        metadata,
        total_requests,
        successful_requests,
        failed_requests
    )
    VALUES (
        gen_random_uuid(),
        v_key_hash,
        v_key_prefix,
        v_key_suffix,
        v_admin_id,  -- 管理者アカウントのID
        true,
        'active',
        now(),
        now() + interval '10 years',  -- 長期有効
        'Master API Key',
        'Production API Key for XBRL Financial Data - Full Access',
        'production',
        'enterprise',  -- 最高レベルのティア
        jsonb_build_object(
            'read', true,
            'write', true,
            'admin', true,
            'unlimited', true
        ),
        jsonb_build_object(
            'original_key_identifier', 'xbrl_live_12b1a...',
            'created_by', 'system_setup',
            'purpose', 'Claude Desktop MCP Integration',
            'scope', 'Full system access',
            'rate_limit', 'unlimited'
        ),
        0,  -- total_requests
        0,  -- successful_requests
        0   -- failed_requests
    )
    ON CONFLICT (key_hash) DO UPDATE
    SET 
        is_active = true,
        status = 'active',
        user_id = v_admin_id,
        expires_at = now() + interval '10 years',
        tier = 'enterprise',
        permissions = jsonb_build_object(
            'read', true,
            'write', true,
            'admin', true,
            'unlimited', true
        ),
        updated_at = now();
    
    RAISE NOTICE '✅ API key registered successfully';
    RAISE NOTICE 'Key hash: %', v_key_hash;
    RAISE NOTICE 'Key display: % ... %', v_key_prefix, v_key_suffix;
    RAISE NOTICE 'Linked to: admin@xbrl-api.com';
END $$;

-- 3. 登録結果の確認
SELECT 
    '=== Registered API Key ===' as info;

SELECT 
    ak.key_prefix || '***' || ak.key_suffix as api_key_display,
    u.email as owner_email,
    u.name as owner_name,
    u.role as owner_role,
    ak.is_active,
    ak.status,
    ak.tier,
    ak.environment,
    ak.expires_at,
    ak.permissions,
    ak.name as key_name,
    ak.description
FROM api_keys ak
JOIN users u ON ak.user_id = u.id
WHERE u.id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY ak.created_at DESC;

-- 4. APIキー検証関数の作成/更新
CREATE OR REPLACE FUNCTION verify_api_key(p_api_key TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    user_id UUID,
    user_email TEXT,
    user_role TEXT,
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
        u.email as user_email,
        u.role as user_role,
        ak.tier,
        ak.permissions
    FROM api_keys ak
    JOIN users u ON ak.user_id = u.id
    WHERE ak.key_hash = v_key_hash
        AND ak.key_prefix = v_key_prefix
        AND ak.key_suffix = v_key_suffix
    LIMIT 1;
    
    -- 使用履歴を更新（成功時のみ）
    IF FOUND THEN
        UPDATE api_keys 
        SET 
            last_used_at = now(),
            total_requests = COALESCE(total_requests, 0) + 1,
            successful_requests = COALESCE(successful_requests, 0) + 1
        WHERE key_hash = v_key_hash;
        
        -- ユーザーのAPI呼び出し回数も更新
        UPDATE users
        SET 
            total_api_calls = COALESCE(total_api_calls, 0) + 1,
            monthly_api_calls = COALESCE(monthly_api_calls, 0) + 1,
            last_login = now()
        WHERE id = (
            SELECT user_id FROM api_keys 
            WHERE key_hash = v_key_hash
            LIMIT 1
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. 検証テスト
SELECT 
    '=== API Key Verification Test ===' as info;

SELECT * FROM verify_api_key('xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830');

-- 6. 統計情報
SELECT 
    '=== System Statistics ===' as info;

SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM api_keys WHERE is_active = true) as active_api_keys,
    (SELECT COUNT(*) FROM api_keys WHERE tier = 'enterprise') as enterprise_keys,
    (SELECT COUNT(*) FROM companies) as total_companies,
    (SELECT COUNT(*) FROM companies WHERE description LIKE '%FY2016%') as fy2016_companies;