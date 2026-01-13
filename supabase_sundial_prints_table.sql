-- Create the sundial_prints table in Supabase
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sundial_prints (
  id BIGSERIAL PRIMARY KEY,
  location TEXT,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  inclination NUMERIC(5, 2) NOT NULL,
  declination NUMERIC(5, 2) NOT NULL DEFAULT 0,
  gnomon_type TEXT NOT NULL,
  notes_type TEXT NOT NULL,
  date_range TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_sundial_prints_created_at ON sundial_prints(created_at DESC);

-- Enable Row Level Security (RLS) if needed
-- For now, we'll use the anon key with policies that allow all operations
ALTER TABLE sundial_prints ENABLE ROW LEVEL SECURITY;

-- Create policies to allow read and insert for anon users
-- These policies allow anyone to read and insert (using anon key)
CREATE POLICY "Allow anonymous read access" ON sundial_prints
  FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous insert access" ON sundial_prints
  FOR INSERT
  WITH CHECK (true);

-- Migration: Add location column to existing tables
-- NOTE: If you already added location with ALTER TABLE, it will be at the end.
-- The CREATE TABLE above has location in the correct position (before latitude).
-- For existing tables with location at the end, you can either:
-- 1. Leave it as-is (column order doesn't affect functionality)
-- 2. Recreate the table to reorder columns (see migration script below)

-- Quick add (adds at end):
-- ALTER TABLE sundial_prints ADD COLUMN IF NOT EXISTS location TEXT;

-- Full migration to reorder (preserves data, recreates table):
-- BEGIN;
-- CREATE TABLE sundial_prints_new (LIKE sundial_prints INCLUDING ALL);
-- ALTER TABLE sundial_prints_new DROP COLUMN location;
-- ALTER TABLE sundial_prints_new ADD COLUMN location TEXT;
-- ALTER TABLE sundial_prints_new ALTER COLUMN location SET DEFAULT NULL;
-- ALTER TABLE sundial_prints_new ALTER COLUMN location DROP DEFAULT;
-- INSERT INTO sundial_prints_new (id, latitude, longitude, inclination, declination, gnomon_type, notes_type, date_range, created_at, location)
-- SELECT id, latitude, longitude, inclination, declination, gnomon_type, notes_type, date_range, created_at, location FROM sundial_prints;
-- DROP TABLE sundial_prints;
-- ALTER TABLE sundial_prints_new RENAME TO sundial_prints;
-- COMMIT;
