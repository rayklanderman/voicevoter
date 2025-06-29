/*
  # Enhanced Questions Schema for Trending Topics

  1. New Columns
    - `source` (text) - Track where questions originated (manual, X, Facebook, etc.)
    - `metadata` (jsonb) - Store additional data like original topic, keywords, etc.
    - `moderation_status` (text) - Track approval status (approved, pending, rejected)
    - `trending_score` (integer) - Score for trending relevance (0-100)

  2. Indexes
    - Add indexes for efficient querying by source, moderation status, and trending score

  3. Security
    - Update RLS policies to handle moderation and allow question insertion
*/

-- Add new columns to questions table
DO $$
BEGIN
  -- Add source column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'source'
  ) THEN
    ALTER TABLE questions ADD COLUMN source text DEFAULT 'manual';
  END IF;

  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE questions ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;

  -- Add moderation_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'moderation_status'
  ) THEN
    ALTER TABLE questions ADD COLUMN moderation_status text DEFAULT 'approved';
  END IF;

  -- Add trending_score column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'trending_score'
  ) THEN
    ALTER TABLE questions ADD COLUMN trending_score integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_questions_source ON questions(source);
CREATE INDEX IF NOT EXISTS idx_questions_moderation ON questions(moderation_status);
CREATE INDEX IF NOT EXISTS idx_questions_trending_score ON questions(trending_score DESC);

-- Update RLS policies
-- First drop the existing policy
DROP POLICY IF EXISTS "Anyone can read questions" ON questions;

-- Create new policy for reading approved questions
CREATE POLICY "Anyone can read approved questions"
  ON questions
  FOR SELECT
  TO anon, authenticated
  USING (moderation_status = 'approved');

-- Check if insert policy exists and drop it if it does
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'questions' 
    AND policyname = 'Anyone can insert questions'
  ) THEN
    DROP POLICY "Anyone can insert questions" ON questions;
  END IF;
END $$;

-- Create policy for inserting questions (for trending topic generation)
CREATE POLICY "Anyone can insert questions"
  ON questions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);