/*
# Add circuit photo, map embed, and poster to races

## Problem
Race organizers need to attach visual information to each race:
- A photo of the circuit/parcours
- An embedded map showing the race itinerary (Google Maps embed URL)
- A poster/affiche image for the race announcement

## Changes

### 1. New columns on `races` table
- `circuit_photo_url` (text, nullable) — URL of the uploaded circuit photo in Supabase Storage
- `map_embed_url` (text, nullable) — Full embed URL for Google Maps (or similar) showing the race itinerary
- `poster_url` (text, nullable) — URL of the uploaded race poster/affiche image

### 2. Storage bucket
- Create a public storage bucket named `race-media` for uploading circuit photos and posters
- Public read access so race announcements can display images to all users

### 3. Security
- No RLS changes needed — existing race policies already cover the new columns
- Storage bucket is public for read; uploads use the authenticated Supabase client
*/

ALTER TABLE races ADD COLUMN IF NOT EXISTS circuit_photo_url text;
ALTER TABLE races ADD COLUMN IF NOT EXISTS map_embed_url text;
ALTER TABLE races ADD COLUMN IF NOT EXISTS poster_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('race-media', 'race-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "race_media_public_read" ON storage.objects;
CREATE POLICY "race_media_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'race-media');

DROP POLICY IF EXISTS "race_media_auth_upload" ON storage.objects;
CREATE POLICY "race_media_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'race-media');

DROP POLICY IF EXISTS "race_media_auth_update" ON storage.objects;
CREATE POLICY "race_media_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'race-media')
  WITH CHECK (bucket_id = 'race-media');

DROP POLICY IF EXISTS "race_media_auth_delete" ON storage.objects;
CREATE POLICY "race_media_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'race-media');
