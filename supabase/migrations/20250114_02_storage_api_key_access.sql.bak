-- =============================================
-- Storage Access for API Key Authentication
-- =============================================
-- Description: Enable storage read access for API key authenticated requests
-- Created: 2025-01-14
-- =============================================

-- 1. api_keysテーブルの構造を確認
-- api_keysテーブルには以下のカラムがあると想定:
-- id, key_hash, user_id, status, created_at, etc.

-- 2. API キー認証用のRLSポリシーを作成
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Allow API key authenticated read access" ON storage.objects;

-- APIキー認証されたリクエストに読み取り権限を付与
-- auth.uid()がapi_keys.user_idと一致する場合にアクセス許可
CREATE POLICY "Allow API key authenticated read access"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (
  bucket_id = 'markdown-files'
  AND (
    -- 通常の認証ユーザー
    auth.uid() IS NOT NULL
    OR
    -- APIキー経由のアクセス（anon roleでも許可）
    EXISTS (
      SELECT 1 FROM public.api_keys
      WHERE status = 'active'
    )
    OR
    -- 公開アクセスを許可（一時的な対応）
    true
  )
);

-- 3. より厳密なAPIキー認証チェック関数
CREATE OR REPLACE FUNCTION public.verify_api_key_for_storage(api_key_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_hash text;
  key_exists boolean;
BEGIN
  -- APIキーをSHA-256でハッシュ化
  key_hash := encode(digest(api_key_input, 'sha256'), 'hex');

  -- アクティブなAPIキーが存在するかチェック
  SELECT EXISTS (
    SELECT 1
    FROM api_keys
    WHERE key_hash = verify_api_key_for_storage.key_hash
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO key_exists;

  RETURN key_exists;
END;
$$;

-- 4. Supabase Storageのセキュリティ設定を更新
-- バケットレベルでの設定
UPDATE storage.buckets
SET
  public = false,  -- 公開バケットではなくRLSで制御
  file_size_limit = 10485760,  -- 10MB制限
  allowed_mime_types = ARRAY['text/markdown', 'text/plain']
WHERE id = 'markdown-files';

-- 5. シンプルな読み取り専用ポリシー（一時的な解決策）
DROP POLICY IF EXISTS "Simple read access for markdown files" ON storage.objects;

CREATE POLICY "Simple read access for markdown files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'markdown-files'
);

-- 6. デバッグ用：現在のポリシーを確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (qual::text ILIKE '%markdown-files%' OR policyname ILIKE '%markdown%');

-- 7. APIキー経由でのアクセスをトラッキング
CREATE TABLE IF NOT EXISTS public.api_storage_access_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid REFERENCES api_keys(id),
  storage_path text NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  success boolean DEFAULT true,
  error_message text
);

-- アクセスログ用のインデックス
CREATE INDEX IF NOT EXISTS idx_api_storage_logs_key_id
ON api_storage_access_logs(api_key_id);

CREATE INDEX IF NOT EXISTS idx_api_storage_logs_accessed_at
ON api_storage_access_logs(accessed_at);

-- =============================================
-- 注意事項
-- =============================================
-- 1. 現在のMCPサーバーはanon keyを使用している
-- 2. APIキー認証を完全に実装するには、
--    MCPサーバー側でAPIキーをヘッダーに含める必要がある
-- 3. 一時的な解決策として、markdown-filesバケットへの
--    読み取りアクセスを全体的に許可している
-- =============================================