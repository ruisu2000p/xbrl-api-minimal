-- Add ON DELETE CASCADE to all user_id foreign key constraints
-- This allows auth.users deletion to automatically cascade to related tables

-- STEP 0: Cleanup orphaned records (user_id not in auth.users)

-- 0-1. Delete orphaned api_keys
DELETE FROM private.api_keys
WHERE user_id IS NOT NULL
  AND user_id NOT IN (SELECT id FROM auth.users);

-- 0-2. Delete orphaned user_subscriptions
DELETE FROM private.user_subscriptions
WHERE user_id IS NOT NULL
  AND user_id NOT IN (SELECT id FROM auth.users);

-- 0-3. Set NULL for orphaned account_deletions (preserve audit records)
UPDATE public.account_deletions
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND user_id NOT IN (SELECT id FROM auth.users);

-- STEP 1: Add foreign key constraints with CASCADE

-- 1. api_keys table (private schema)
ALTER TABLE IF EXISTS private.api_keys
  DROP CONSTRAINT IF EXISTS api_keys_user_id_fkey;

ALTER TABLE IF EXISTS private.api_keys
  ADD CONSTRAINT api_keys_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT api_keys_user_id_fkey ON private.api_keys IS
  'Cascade delete API keys when user is deleted from auth.users';

-- 2. user_subscriptions table (private schema)
ALTER TABLE IF EXISTS private.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;

ALTER TABLE IF EXISTS private.user_subscriptions
  ADD CONSTRAINT user_subscriptions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT user_subscriptions_user_id_fkey ON private.user_subscriptions IS
  'Cascade delete user subscriptions when user is deleted from auth.users';

-- 3. account_deletions table (public schema)
ALTER TABLE IF EXISTS public.account_deletions
  DROP CONSTRAINT IF EXISTS account_deletions_user_id_fkey;

ALTER TABLE IF EXISTS public.account_deletions
  ADD CONSTRAINT account_deletions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT account_deletions_user_id_fkey ON public.account_deletions IS
  'Set NULL when user is deleted from auth.users (preserve deletion records for audit)';
