-- Enable RLS on private.profiles and add policies for user access
-- This fixes 403 errors when authenticated users try to read their own profile data

-- STEP 1: Enable Row Level Security on private.profiles
ALTER TABLE private.profiles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE private.profiles IS
  'User profiles - RLS enabled. Users can read their own profile data.';

-- STEP 2: Add SELECT policy - Users can read their own profile
CREATE POLICY "Users can read their own profile"
ON private.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);

COMMENT ON POLICY "Users can read their own profile" ON private.profiles IS
  'Allows authenticated users to SELECT their own profile data. auth.uid() wrapped in SELECT for performance optimization.';

-- STEP 3: Add INSERT policy - Users can create their own profile
CREATE POLICY "Users can insert their own profile"
ON private.profiles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);

COMMENT ON POLICY "Users can insert their own profile" ON private.profiles IS
  'Allows authenticated users to INSERT their own profile during signup. auth.uid() wrapped in SELECT for performance optimization.';

-- STEP 4: Add UPDATE policy - Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON private.profiles
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

COMMENT ON POLICY "Users can update their own profile" ON private.profiles IS
  'Allows authenticated users to UPDATE their own profile data. auth.uid() wrapped in SELECT for performance optimization.';

-- STEP 5: Add service role policy for admin access
CREATE POLICY "Service role has full access"
ON private.profiles
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Service role has full access" ON private.profiles IS
  'Allows service_role (backend/admin) full access to all profiles for system operations.';

-- Verification query (run after migration):
-- SELECT schemaname, tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'private' AND tablename = 'profiles'
-- ORDER BY policyname;
