/*
# Add profiles, shared access model, and account management

## Overview
Transforms the app from fully owner-scoped to a shared access model:
- Admin (pre-created) creates races/competitions visible to all associations.
- Associations sign up, see admin-created races, and register their riders.
- Admin sees all registrations and approves/rejects per race.
- Admin can close (deactivate) association accounts.

## New Tables
- `profiles` — stores user role and account status (active/closed).
  - `id` (uuid, PK, references auth.users)
  - `email` (text)
  - `role` (text: admin, organizer, commissaire, club, rider)
  - `is_active` (boolean, default true)
  - `club_name` (text, nullable — association name)
  - `created_at` (timestamptz)

## New Columns
- `is_global boolean DEFAULT false` added to: championships, cups, stages, races, categories.
  When true, the row is visible to all authenticated users (admin-created shared content).

## New Functions
- `is_admin()` — returns true if current user's profile role is 'admin' or 'super_admin'.
- `is_active_user()` — returns true if current user has an active profile.
- `handle_new_user()` — trigger: auto-creates a profile when a user signs up.

## Security Changes (RLS)
- **profiles**: users read own; admin reads/updates all (to close accounts).
- **categories**: all authenticated can SELECT global rows; owner manages own.
- **championships, cups, stages, races**: all authenticated can SELECT global rows;
  owner manages own. Only active users can write.
- **registrations**: associations see their own; admin sees all. Only admin can
  UPDATE (approve/reject). Owner or admin can DELETE.
- **riders, clubs**: owner or admin can SELECT; owner manages own (if active).
- **results**: owner or admin can SELECT; owner manages own (if active).
- **points_scales, notifications**: unchanged (owner-scoped).

## Backfill
- Creates profiles for any existing auth.users who don't have one yet,
  copying role from user_metadata.
*/

-- =========================================================
-- 1. PROFILES TABLE (no policies yet — functions must exist first)
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text NOT NULL DEFAULT 'club',
  is_active boolean NOT NULL DEFAULT true,
  club_name text,
  created_at timestamptz DEFAULT now()
);

-- =========================================================
-- 2. HELPER FUNCTIONS (SECURITY DEFINER for cross-schema access)
-- =========================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'super_admin') FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION is_active_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- =========================================================
-- 3. PROFILES RLS (now that is_admin() exists)
-- =========================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "update_admin_profile" ON profiles;
CREATE POLICY "update_admin_profile" ON profiles FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- =========================================================
-- 4. TRIGGER: auto-create profile on signup
-- =========================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'club')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =========================================================
-- 5. BACKFILL profiles for existing users
-- =========================================================
INSERT INTO public.profiles (id, email, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'role', 'club')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 6. ADD is_global COLUMN to shared tables
-- =========================================================
ALTER TABLE championships ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;
ALTER TABLE cups ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;
ALTER TABLE stages ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;
ALTER TABLE races ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;

-- =========================================================
-- 7. UPDATE RLS POLICIES
-- =========================================================

-- ---------- CATEGORIES ----------
DROP POLICY IF EXISTS "select_own_categories" ON categories;
CREATE POLICY "select_own_categories" ON categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_global = true);

DROP POLICY IF EXISTS "insert_own_categories" ON categories;
CREATE POLICY "insert_own_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "update_own_categories" ON categories;
CREATE POLICY "update_own_categories" ON categories FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "delete_own_categories" ON categories;
CREATE POLICY "delete_own_categories" ON categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id AND is_active_user());

-- ---------- CHAMPIONSHIPS ----------
DROP POLICY IF EXISTS "select_own_championships" ON championships;
CREATE POLICY "select_own_championships" ON championships FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_global = true);

DROP POLICY IF EXISTS "insert_own_championships" ON championships;
CREATE POLICY "insert_own_championships" ON championships FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "update_own_championships" ON championships;
CREATE POLICY "update_own_championships" ON championships FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "delete_own_championships" ON championships;
CREATE POLICY "delete_own_championships" ON championships FOR DELETE
  TO authenticated USING (auth.uid() = user_id AND is_active_user());

-- ---------- CUPS ----------
DROP POLICY IF EXISTS "select_own_cups" ON cups;
CREATE POLICY "select_own_cups" ON cups FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_global = true);

DROP POLICY IF EXISTS "insert_own_cups" ON cups;
CREATE POLICY "insert_own_cups" ON cups FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "update_own_cups" ON cups;
CREATE POLICY "update_own_cups" ON cups FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "delete_own_cups" ON cups;
CREATE POLICY "delete_own_cups" ON cups FOR DELETE
  TO authenticated USING (auth.uid() = user_id AND is_active_user());

-- ---------- STAGES ----------
DROP POLICY IF EXISTS "select_own_stages" ON stages;
CREATE POLICY "select_own_stages" ON stages FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_global = true);

DROP POLICY IF EXISTS "insert_own_stages" ON stages;
CREATE POLICY "insert_own_stages" ON stages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "update_own_stages" ON stages;
CREATE POLICY "update_own_stages" ON stages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "delete_own_stages" ON stages;
CREATE POLICY "delete_own_stages" ON stages FOR DELETE
  TO authenticated USING (auth.uid() = user_id AND is_active_user());

-- ---------- RACES ----------
DROP POLICY IF EXISTS "select_own_races" ON races;
CREATE POLICY "select_own_races" ON races FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_global = true);

DROP POLICY IF EXISTS "insert_own_races" ON races;
CREATE POLICY "insert_own_races" ON races FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "update_own_races" ON races;
CREATE POLICY "update_own_races" ON races FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "delete_own_races" ON races;
CREATE POLICY "delete_own_races" ON races FOR DELETE
  TO authenticated USING (auth.uid() = user_id AND is_active_user());

-- ---------- REGISTRATIONS ----------
DROP POLICY IF EXISTS "select_own_registrations" ON registrations;
CREATE POLICY "select_own_registrations" ON registrations FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_registrations" ON registrations;
CREATE POLICY "insert_own_registrations" ON registrations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "update_own_registrations" ON registrations;
CREATE POLICY "update_own_registrations" ON registrations FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_own_registrations" ON registrations;
CREATE POLICY "delete_own_registrations" ON registrations FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- ---------- RIDERS ----------
DROP POLICY IF EXISTS "select_own_riders" ON riders;
CREATE POLICY "select_own_riders" ON riders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_riders" ON riders;
CREATE POLICY "insert_own_riders" ON riders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "update_own_riders" ON riders;
CREATE POLICY "update_own_riders" ON riders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "delete_own_riders" ON riders;
CREATE POLICY "delete_own_riders" ON riders FOR DELETE
  TO authenticated USING (auth.uid() = user_id AND is_active_user());

-- ---------- CLUBS ----------
DROP POLICY IF EXISTS "select_own_clubs" ON clubs;
CREATE POLICY "select_own_clubs" ON clubs FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_clubs" ON clubs;
CREATE POLICY "insert_own_clubs" ON clubs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "update_own_clubs" ON clubs;
CREATE POLICY "update_own_clubs" ON clubs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "delete_own_clubs" ON clubs;
CREATE POLICY "delete_own_clubs" ON clubs FOR DELETE
  TO authenticated USING (auth.uid() = user_id AND is_active_user());

-- ---------- RESULTS ----------
DROP POLICY IF EXISTS "select_own_results" ON results;
CREATE POLICY "select_own_results" ON results FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_results" ON results;
CREATE POLICY "insert_own_results" ON results FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "update_own_results" ON results;
CREATE POLICY "update_own_results" ON results FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND is_active_user());

DROP POLICY IF EXISTS "delete_own_results" ON results;
CREATE POLICY "delete_own_results" ON results FOR DELETE
  TO authenticated USING (auth.uid() = user_id AND is_active_user());

-- =========================================================
-- 8. INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_races_global ON races(is_global);
CREATE INDEX IF NOT EXISTS idx_stages_global ON stages(is_global);
CREATE INDEX IF NOT EXISTS idx_championships_global ON championships(is_global);
CREATE INDEX IF NOT EXISTS idx_cups_global ON cups(is_global);
