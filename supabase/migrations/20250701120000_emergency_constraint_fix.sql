-- Emergency fix for database constraint issues
-- Date: July 1, 2025

-- Fix the foreign key constraint name mismatch
-- The error shows 'votes_question_id_fkey' but we're expecting 'trending_topics_questions_trending_topic_id_fkey'

-- First, let's drop and recreate the correct foreign key constraint names
DO $$
BEGIN
  -- Drop existing foreign key constraints that might have wrong names
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'votes_question_id_fkey'
    AND table_name = 'votes'
  ) THEN
    ALTER TABLE votes DROP CONSTRAINT votes_question_id_fkey;
  END IF;
  
  -- Create the correct foreign key constraint for votes -> questions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'votes_question_id_fkey'
    AND table_name = 'votes'
  ) THEN
    ALTER TABLE votes 
    ADD CONSTRAINT votes_question_id_fkey 
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix the trending topics foreign key constraint name
DO $$
BEGIN
  -- Check if the foreign key exists with the correct name from our migration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trending_topics_questions_trending_topic_id_fkey'
    AND table_name = 'questions'
  ) THEN
    -- Check if it exists with a different name and drop it
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name LIKE '%trending_topic_id%'
      AND table_name = 'questions'
    ) THEN
      -- Get the actual constraint name and drop it
      DECLARE
        constraint_name_var text;
      BEGIN
        SELECT constraint_name INTO constraint_name_var
        FROM information_schema.table_constraints
        WHERE constraint_name LIKE '%trending_topic_id%'
        AND table_name = 'questions'
        LIMIT 1;
        
        IF constraint_name_var IS NOT NULL THEN
          EXECUTE 'ALTER TABLE questions DROP CONSTRAINT ' || constraint_name_var;
        END IF;
      END;
    END IF;
    
    -- Create the foreign key constraint with the expected name
    ALTER TABLE questions 
    ADD CONSTRAINT trending_topics_questions_trending_topic_id_fkey 
    FOREIGN KEY (trending_topic_id) REFERENCES trending_topics(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Fix trend_votes foreign key constraint
DO $$
BEGIN
  -- Drop existing constraint if it has wrong name
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'trend_votes_trending_topic_id_fkey'
    AND table_name = 'trend_votes'
  ) THEN
    ALTER TABLE trend_votes DROP CONSTRAINT trend_votes_trending_topic_id_fkey;
  END IF;
  
  -- Create the correct foreign key constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'trend_votes_trending_topic_id_fkey'
    AND table_name = 'trend_votes'
  ) THEN
    ALTER TABLE trend_votes 
    ADD CONSTRAINT trend_votes_trending_topic_id_fkey 
    FOREIGN KEY (trending_topic_id) REFERENCES trending_topics(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure all required columns exist
DO $$
BEGIN
  -- Ensure trending_topic_id exists in questions table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' 
    AND column_name = 'trending_topic_id'
  ) THEN
    ALTER TABLE questions ADD COLUMN trending_topic_id uuid;
  END IF;
  
  -- Ensure question_id column exists in votes table (should already exist)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'votes' 
    AND column_name = 'question_id'
  ) THEN
    ALTER TABLE votes ADD COLUMN question_id uuid NOT NULL;
  END IF;
END $$;

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_votes_question_id ON votes(question_id);
CREATE INDEX IF NOT EXISTS idx_questions_trending_topic_id ON questions(trending_topic_id);
CREATE INDEX IF NOT EXISTS idx_trend_votes_trending_topic_id ON trend_votes(trending_topic_id);

-- Fix RLS policies that might be causing 409 conflicts
-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Users can insert questions" ON questions;
DROP POLICY IF EXISTS "Users can update questions" ON questions;

-- Create policies that allow question insertion
CREATE POLICY "Users can insert questions"
  ON questions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update questions"
  ON questions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure the questions policy allows all approved questions to be read
DROP POLICY IF EXISTS "Anyone can read approved questions" ON questions;
CREATE POLICY "Anyone can read approved questions"
  ON questions
  FOR SELECT
  TO anon, authenticated
  USING (moderation_status = 'approved' OR moderation_status IS NULL);

-- Emergency fix complete
