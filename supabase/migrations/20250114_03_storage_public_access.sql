-- =============================================
-- Storage Bucket Public Access Migration
-- =============================================
-- Description: Enable public read access for markdown-files bucket
-- Created: 2025-01-14
-- =============================================

-- 1. Storageバケットの公開設定を更新
UPDATE storage.buckets
SET public = true
WHERE id = 'markdown-files';

-- 2. RLSポリシーを作成（anon roleに読み取り権限を付与）

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read access" ON storage.objects;

-- anon roleとauthenticated roleの両方に読み取り権限を付与
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'markdown-files'
);

-- より具体的なポリシー（anon roleのみ）
CREATE POLICY "Allow anon read access"
ON storage.objects FOR SELECT
TO anon
USING (
  bucket_id = 'markdown-files'
);

-- authenticated roleにも読み取り権限
CREATE POLICY "Allow authenticated read access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'markdown-files'
);

-- 3. バケットのメタデータを確認（デバッグ用）
DO $$
DECLARE
  bucket_info RECORD;
BEGIN
  SELECT * INTO bucket_info
  FROM storage.buckets
  WHERE id = 'markdown-files';

  IF bucket_info IS NOT NULL THEN
    RAISE NOTICE 'Bucket % configuration: public=%',
      bucket_info.id, bucket_info.public;
  ELSE
    RAISE WARNING 'Bucket markdown-files not found';
  END IF;
END $$;

-- 4. ストレージオブジェクトへのアクセス権限を確認する関数
CREATE OR REPLACE FUNCTION check_storage_access()
RETURNS TABLE (
  policy_name text,
  roles text[],
  operation text,
  bucket_id text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT
    pol.policyname::text as policy_name,
    pol.roles as roles,
    pol.cmd::text as operation,
    (pol.qual::text ILIKE '%markdown-files%')::text as bucket_id
  FROM pg_policies pol
  WHERE pol.tablename = 'objects'
    AND pol.schemaname = 'storage'
    AND pol.qual::text ILIKE '%markdown-files%';
$$;

-- 5. 現在のアクセス権限を表示
SELECT * FROM check_storage_access();

-- 6. バケットの設定を確認
SELECT
  id,
  name,
  public,
  created_at,
  updated_at
FROM storage.buckets
WHERE id = 'markdown-files';

-- =============================================
-- 補足: このマイグレーションを適用後の動作
-- =============================================
-- 1. markdown-filesバケットが公開設定になります
-- 2. anon roleでもストレージファイルを読み取れます
-- 3. MCPツールのget-storage-mdが正常動作します
-- =============================================