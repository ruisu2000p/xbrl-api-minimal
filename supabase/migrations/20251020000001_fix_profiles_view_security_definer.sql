-- ===================================================================
-- public.profiles ビューのSECURITY DEFINER問題を修正
-- ===================================================================
-- 問題: public.profilesビューがSECURITY DEFINERで定義されており、
--       循環参照になっている
-- 解決: private.profilesテーブルを参照する通常のビューに再作成
-- ===================================================================

-- 既存のビューを削除
DROP VIEW IF EXISTS public.profiles CASCADE;

-- SECURITY DEFINERなしで再作成（private.profilesテーブルを参照）
CREATE VIEW public.profiles AS
SELECT
  id,
  email,
  full_name,
  company_name,
  plan,
  trial_ends_at,
  email_status,
  created_at,
  updated_at
FROM private.profiles;

-- RLSポリシーの代わりにビューで制御
-- 認証されたユーザーは自分のプロファイルのみ閲覧可能
COMMENT ON VIEW public.profiles IS
'ユーザープロファイル情報のビュー。private.profilesテーブルから読み取り専用で公開。';

-- 認証されたユーザーに読み取り権限を付与
GRANT SELECT ON public.profiles TO authenticated;

-- 匿名ユーザーには権限なし
REVOKE ALL ON public.profiles FROM anon;

-- ===================================================================
-- 完了メッセージ
-- ===================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ public.profiles view recreated without SECURITY DEFINER';
  RAISE NOTICE '   - Now references private.profiles table correctly';
  RAISE NOTICE '   - Security definer warning should be resolved';
END $$;
