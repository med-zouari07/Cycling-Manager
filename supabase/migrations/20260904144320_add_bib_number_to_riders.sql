/*
# Add bib_number to riders table

## Problem
The riders table has no bib_number (dossard) column. Users need to import
riders with their dossard numbers from Excel.

## Changes
1. Add `bib_number integer` column to `riders` table (nullable, no default).
2. No RLS changes needed — existing policies already cover the column.
*/

ALTER TABLE riders ADD COLUMN IF NOT EXISTS bib_number integer;

CREATE INDEX IF NOT EXISTS idx_riders_bib_number ON riders(bib_number);
