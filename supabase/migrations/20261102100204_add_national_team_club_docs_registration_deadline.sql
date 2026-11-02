/*
# National Team, Club Annual Documents, and Registration Deadlines

## Overview
Three new capabilities requested by the FTC admin:
1. A "National Team" section in the admin area where athletes are grouped by
   category, each with their passport/visa and supporting documents.
2. Each association (club) can upload its annual registration document; the
   FTC admin receives and can review/approve them.
3. Each race/competition can have a registration deadline; new registrations
   are blocked after that date.

## New Tables

### national_team_athletes
Athletes selected for the national team. Admin-managed (only admin can write).
- id (uuid PK)
- first_name (text, not null)
- last_name (text, not null)
- photo_url (text, nullable)
- sex (text: 'M'|'F', nullable)
- birth_date (date, nullable)
- category_id (uuid -> categories, nullable) — groups athletes by category
- nationality (text, nullable)
- license_number (text, nullable)
- passport_url (text, nullable) — passport/visa document URL in storage
- user_id (uuid, owner, defaults to auth.uid())
- created_at (timestamptz)

### national_team_documents
Supporting documents per national-team athlete (medical certificate, etc.).
- id (uuid PK)
- athlete_id (uuid -> national_team_athletes ON DELETE CASCADE, not null)
- label (text, not null) — document name/description
- file_url (text, not null) — document URL in storage
- user_id (uuid, owner, defaults to auth.uid())
- created_at (timestamptz)

### club_annual_documents
Each association uploads its annual registration document. Admin reviews.
- id (uuid PK)
- club_id (uuid -> clubs ON DELETE CASCADE, not null)
- season (text, not null) — e.g. "2026"
- document_url (text, not null) — uploaded document URL in storage
- status (text, default 'pending': pending|approved|rejected)
- admin_note (text, nullable) — note from admin on review
- user_id (uuid, owner, defaults to auth.uid())
- created_at (timestamptz)
- UNIQUE (club_id, season) — one document per club per season

## New Columns
- races.registration_deadline (timestamptz, nullable) — after this date no new
  registrations are accepted for the race.

## Storage
- Create a public storage bucket `documents` for passports and annual
  registration documents (PDF/images). Public read, authenticated upload.

## Security (RLS)
- national_team_athletes: admin can CRUD; all authenticated can SELECT.
- national_team_documents: admin can CRUD; all authenticated can SELECT.
- club_annual_documents: owner (club) can INSERT/SELECT/DELETE own; admin can
  SELECT all and UPDATE (review). Each club sees only its own rows; admin sees all.
- No RLS changes for races (existing policies cover the new nullable column).

## Notes
1. `national_team_*` tables use `is_admin()` (SECURITY DEFINER helper) so only
   admin/super_admin can write; all authenticated users can read.
2. `club_annual_documents` uses a direct ownership check on `user_id` for the
   club owner, plus `is_admin()` for admin review access.
3. The registration deadline is enforced in application code (frontend), not
   via a database constraint, because admin may still need to register riders
   past the deadline.
*/

-- =========================================================
-- 1. STORAGE BUCKET for documents
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documents_public_read" ON storage.objects;
CREATE POLICY "documents_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_auth_upload" ON storage.objects;
CREATE POLICY "documents_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_auth_update" ON storage.objects;
CREATE POLICY "documents_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_auth_delete" ON storage.objects;
CREATE POLICY "documents_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents');

-- =========================================================
-- 2. national_team_athletes
-- =========================================================
CREATE TABLE IF NOT EXISTS national_team_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  photo_url text,
  sex text CHECK (sex IN ('M','F')),
  birth_date date,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  nationality text,
  license_number text,
  passport_url text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE national_team_athletes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON national_team_athletes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON national_team_athletes TO authenticated;

DROP POLICY IF EXISTS "select_nta" ON national_team_athletes;
CREATE POLICY "select_nta" ON national_team_athletes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_nta" ON national_team_athletes;
CREATE POLICY "insert_nta" ON national_team_athletes FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_nta" ON national_team_athletes;
CREATE POLICY "update_nta" ON national_team_athletes FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_nta" ON national_team_athletes;
CREATE POLICY "delete_nta" ON national_team_athletes FOR DELETE
  TO authenticated USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_nta_category ON national_team_athletes(category_id);

-- =========================================================
-- 3. national_team_documents
-- =========================================================
CREATE TABLE IF NOT EXISTS national_team_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES national_team_athletes(id) ON DELETE CASCADE,
  label text NOT NULL,
  file_url text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE national_team_documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON national_team_documents TO authenticated;
GRANT INSERT, UPDATE, DELETE ON national_team_documents TO authenticated;

DROP POLICY IF EXISTS "select_ntd" ON national_team_documents;
CREATE POLICY "select_ntd" ON national_team_documents FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_ntd" ON national_team_documents;
CREATE POLICY "insert_ntd" ON national_team_documents FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_ntd" ON national_team_documents;
CREATE POLICY "update_ntd" ON national_team_documents FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_ntd" ON national_team_documents;
CREATE POLICY "delete_ntd" ON national_team_documents FOR DELETE
  TO authenticated USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_ntd_athlete ON national_team_documents(athlete_id);

-- =========================================================
-- 4. club_annual_documents
-- =========================================================
CREATE TABLE IF NOT EXISTS club_annual_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  season text NOT NULL,
  document_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (club_id, season)
);

ALTER TABLE club_annual_documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON club_annual_documents TO authenticated;
GRANT INSERT, UPDATE, DELETE ON club_annual_documents TO authenticated;

-- Owner (club) can see their own; admin can see all
DROP POLICY IF EXISTS "select_cad" ON club_annual_documents;
CREATE POLICY "select_cad" ON club_annual_documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- Only owner (club) can insert their own annual doc
DROP POLICY IF EXISTS "insert_cad" ON club_annual_documents;
CREATE POLICY "insert_cad" ON club_annual_documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND is_active_user());

-- Owner can update their own (e.g. re-upload); admin can update (review status)
DROP POLICY IF EXISTS "update_cad" ON club_annual_documents;
CREATE POLICY "update_cad" ON club_annual_documents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

-- Only owner can delete their own
DROP POLICY IF EXISTS "delete_cad" ON club_annual_documents;
CREATE POLICY "delete_cad" ON club_annual_documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cad_club ON club_annual_documents(club_id);
CREATE INDEX IF NOT EXISTS idx_cad_season ON club_annual_documents(season);

-- =========================================================
-- 5. registration_deadline on races
-- =========================================================
ALTER TABLE races ADD COLUMN IF NOT EXISTS registration_deadline timestamptz;
