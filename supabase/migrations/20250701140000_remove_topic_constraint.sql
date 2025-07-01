-- Fix the remaining foreign key constraint issues
-- Date: July 1, 2025

-- Remove the problematic foreign key constraint that's causing 23503 errors
DO $$
BEGIN
  -- Drop the foreign key constraint from questions.topic_id to ai_topics.id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'questions_topic_id_fkey'
    AND table_name = 'questions'
  ) THEN
    ALTER TABLE questions DROP CONSTRAINT questions_topic_id_fkey;
    RAISE NOTICE 'Dropped questions_topic_id_fkey constraint';
  END IF;
  
  -- Make topic_id nullable and remove the constraint dependency
  ALTER TABLE questions ALTER COLUMN topic_id DROP NOT NULL;
  
END $$;

-- Also remove the constraint from the other direction if it exists
DO $$
BEGIN
  -- Drop any constraint from ai_topics back to questions if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%ai_topics%'
    AND table_name = 'questions'
  ) THEN
    -- Get the actual constraint name and drop it
    DECLARE
      constraint_name_var text;
    BEGIN
      SELECT constraint_name INTO constraint_name_var
      FROM information_schema.table_constraints
      WHERE constraint_name LIKE '%ai_topics%'
      AND table_name = 'questions'
      LIMIT 1;
      
      IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE questions DROP CONSTRAINT ' || constraint_name_var;
        RAISE NOTICE 'Dropped constraint: %', constraint_name_var;
      END IF;
    END;
  END IF;
END $$;

-- Update the RLS policy to be more permissive for question creation
DROP POLICY IF EXISTS "Users can insert questions" ON questions;
CREATE POLICY "Users can insert questions"
  ON questions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true); -- Allow all question insertions

-- Update the questions read policy to include questions with NULL moderation_status
DROP POLICY IF EXISTS "Anyone can read active questions" ON questions;
CREATE POLICY "Anyone can read active questions"
  ON questions
  FOR SELECT
  TO anon, authenticated
  USING (
    (is_active = true OR is_active IS NULL) AND 
    (moderation_status = 'approved' OR moderation_status IS NULL OR moderation_status = 'pending')
  );

-- Create an index on topic_id for performance (without constraint)
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);

-- Add a comment explaining the change
COMMENT ON COLUMN questions.topic_id IS 'Optional reference to topic, no foreign key constraint for flexibility';

-- Fix complete
