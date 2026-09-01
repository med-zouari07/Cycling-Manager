/*
# Cycling Competition Manager — Core Schema

## Overview
Creates the full data model for a cycling competition management platform:
clubs, riders, categories, championships, cups, stages, races, registrations,
results, points scales, and notifications. All tables are owner-scoped to the
authenticated user who created them (multi-user, sign-in required).

## New Tables
- `clubs` — cycling clubs (name, logo, manager, address, phone, email, city, country)
- `categories` — race categories (Elite Homme, Elite Femme, U23, Junior, Cadet, Master)
- `riders` — cyclists (photo, name, sex, dob, category, license, club, nationality, contact, qr)
- `championships` — a season-long championship containing multiple stages
- `cups` — a cup competition containing multiple stages
- `stages` — a round/manche (name, date, time, city, venue, distance, type, parent championship/cup)
- `races` — a single category race within a stage
- `registrations` — club enters a rider into a race; validated by organizer
- `results` — finishing data for a rider in a race (position, time, gap, status)
- `points_scales` — configurable points barème (JSON array of position->points)
- `notifications` — in-app notifications

## Security
- RLS enabled on every table.
- Owner-scoped CRUD via `auth.uid()` for clubs, riders, championships, cups,
  stages, races, registrations, results, points_scales, notifications.
- Categories are shared reference data: any authenticated user can read; any
  authenticated user can manage (simple multi-tenant reference table).
- All owner columns default to `auth.uid()` so client inserts omitting the
  owner still satisfy the WITH CHECK policy.

## Notes
1. `stages` may belong to a championship OR a cup (both nullable, mutually
   exclusive by convention).
2. `races.stage_id` -> stages, `races.category_id` -> categories.
3. `results.race_id` -> races, `results.rider_id` -> riders.
4. `points` column on results is computed by the app from the active scale.
*/

CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  manager text,
  address text,
  phone text,
  email text,
  city text,
  country text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_clubs" ON clubs;
CREATE POLICY "select_own_clubs" ON clubs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_clubs" ON clubs;
CREATE POLICY "insert_own_clubs" ON clubs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_clubs" ON clubs;
CREATE POLICY "update_own_clubs" ON clubs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_clubs" ON clubs;
CREATE POLICY "delete_own_clubs" ON clubs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_categories" ON categories;
CREATE POLICY "select_own_categories" ON categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_categories" ON categories;
CREATE POLICY "insert_own_categories" ON categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_categories" ON categories;
CREATE POLICY "update_own_categories" ON categories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_categories" ON categories;
CREATE POLICY "delete_own_categories" ON categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  photo_url text,
  sex text CHECK (sex IN ('M','F')),
  birth_date date,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  license_number text,
  club_id uuid REFERENCES clubs(id) ON DELETE SET NULL,
  nationality text,
  email text,
  phone text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_riders" ON riders;
CREATE POLICY "select_own_riders" ON riders FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_riders" ON riders;
CREATE POLICY "insert_own_riders" ON riders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_riders" ON riders;
CREATE POLICY "update_own_riders" ON riders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_riders" ON riders;
CREATE POLICY "delete_own_riders" ON riders FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS championships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  season text,
  description text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed')),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE championships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_championships" ON championships;
CREATE POLICY "select_own_championships" ON championships FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_championships" ON championships;
CREATE POLICY "insert_own_championships" ON championships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_championships" ON championships;
CREATE POLICY "update_own_championships" ON championships FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_championships" ON championships;
CREATE POLICY "delete_own_championships" ON championships FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS cups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  season text,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed')),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_cups" ON cups;
CREATE POLICY "select_own_cups" ON cups FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_cups" ON cups;
CREATE POLICY "insert_own_cups" ON cups FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_cups" ON cups;
CREATE POLICY "update_own_cups" ON cups FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_cups" ON cups;
CREATE POLICY "delete_own_cups" ON cups FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stage_date date NOT NULL,
  stage_time time,
  city text,
  venue text,
  distance_km numeric,
  stage_type text NOT NULL DEFAULT 'Route' CHECK (stage_type IN ('Route','Contre-la-montre','VTT','Cyclo-cross','Piste')),
  championship_id uuid REFERENCES championships(id) ON DELETE CASCADE,
  cup_id uuid REFERENCES cups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CHECK (championship_id IS NOT NULL OR cup_id IS NOT NULL)
);

ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_stages" ON stages;
CREATE POLICY "select_own_stages" ON stages FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_stages" ON stages;
CREATE POLICY "insert_own_stages" ON stages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_stages" ON stages;
CREATE POLICY "update_own_stages" ON stages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_stages" ON stages;
CREATE POLICY "delete_own_stages" ON stages FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  bib_start int DEFAULT 1,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (stage_id, category_id)
);

ALTER TABLE races ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_races" ON races;
CREATE POLICY "select_own_races" ON races FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_races" ON races;
CREATE POLICY "insert_own_races" ON races FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_races" ON races;
CREATE POLICY "update_own_races" ON races FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_races" ON races;
CREATE POLICY "delete_own_races" ON races FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  bib_number int,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','validated','refused')),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (race_id, rider_id)
);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_registrations" ON registrations;
CREATE POLICY "select_own_registrations" ON registrations FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_registrations" ON registrations;
CREATE POLICY "insert_own_registrations" ON registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_registrations" ON registrations;
CREATE POLICY "update_own_registrations" ON registrations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_registrations" ON registrations;
CREATE POLICY "delete_own_registrations" ON registrations FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  position int,
  finish_time interval,
  gap interval,
  status text NOT NULL DEFAULT 'finished' CHECK (status IN ('finished','DNF','DNS','DSQ')),
  points int DEFAULT 0,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (race_id, rider_id)
);

ALTER TABLE results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_results" ON results;
CREATE POLICY "select_own_results" ON results FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_results" ON results;
CREATE POLICY "insert_own_results" ON results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_results" ON results;
CREATE POLICY "update_own_results" ON results FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_results" ON results;
CREATE POLICY "delete_own_results" ON results FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS points_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scale jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE points_scales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_points_scales" ON points_scales;
CREATE POLICY "select_own_points_scales" ON points_scales FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_points_scales" ON points_scales;
CREATE POLICY "insert_own_points_scales" ON points_scales FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_points_scales" ON points_scales;
CREATE POLICY "update_own_points_scales" ON points_scales FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_points_scales" ON points_scales;
CREATE POLICY "delete_own_points_scales" ON points_scales FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','competition','registration','results','warning')),
  is_read boolean NOT NULL DEFAULT false,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_riders_club ON riders(club_id);
CREATE INDEX IF NOT EXISTS idx_stages_championship ON stages(championship_id);
CREATE INDEX IF NOT EXISTS idx_stages_cup ON stages(cup_id);
CREATE INDEX IF NOT EXISTS idx_races_stage ON races(stage_id);
CREATE INDEX IF NOT EXISTS idx_registrations_race ON registrations(race_id);
CREATE INDEX IF NOT EXISTS idx_results_race ON results(race_id);
CREATE INDEX IF NOT EXISTS idx_results_rider ON results(rider_id);