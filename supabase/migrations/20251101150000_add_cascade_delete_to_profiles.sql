-- Add ON DELETE CASCADE to private.profiles table
-- This ensures profile records are automatically deleted when auth.users is deleted

-- STEP 1: Drop existing constraint if it exists
ALTER TABLE IF EXISTS private.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- STEP 2: Add new constraint with CASCADE
ALTER TABLE IF EXISTS private.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT profiles_id_fkey ON private.profiles IS
  'Cascade delete profile when user is deleted from auth.users';
