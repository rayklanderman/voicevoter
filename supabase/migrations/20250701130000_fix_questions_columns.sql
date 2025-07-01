-- Fix the missing question columns and foreign key issues
-- Date: July 1, 2025

-- Add missing columns to questions table that the application expects
DO $$
BEGIN
  -- Add is_active column to questions table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE questions ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  
  -- Add question_id column to trending_topics table for direct relationship
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trending_topics' 
    AND column_name = 'question_id'
  ) THEN
    ALTER TABLE trending_topics ADD COLUMN question_id uuid;
  END IF;
END $$;

-- Create a proper foreign key relationship between trending_topics and questions
DO $$
BEGIN
  -- Drop existing foreign key if it exists with wrong name
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trending_topics_question_id_fkey'
    AND table_name = 'trending_topics'
  ) THEN
    ALTER TABLE trending_topics DROP CONSTRAINT trending_topics_question_id_fkey;
  END IF;
  
  -- Create the foreign key constraint from trending_topics to questions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trending_topics_question_id_fkey'
    AND table_name = 'trending_topics'
  ) THEN
    ALTER TABLE trending_topics 
    ADD CONSTRAINT trending_topics_question_id_fkey 
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update all questions to be active by default
UPDATE questions SET is_active = true WHERE is_active IS NULL;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_trending_topics_question_id ON trending_topics(question_id);

-- Ensure all existing trending topics have corresponding questions
-- This will fix the join issues by ensuring the relationship exists
INSERT INTO questions (text, source, is_trending, is_active, moderation_status, trending_score)
SELECT 
  question_text,
  'trending_' || source,
  true,
  true,
  'approved',
  trending_score
FROM trending_topics 
WHERE question_id IS NULL 
  AND is_active = true 
  AND is_safe = true
ON CONFLICT DO NOTHING;

-- Update trending_topics to link to their created questions
UPDATE trending_topics 
SET question_id = q.id
FROM questions q
WHERE trending_topics.question_id IS NULL 
  AND q.text = trending_topics.question_text
  AND q.source LIKE 'trending_%';

-- Fix RLS policies to allow reading all active questions (not just approved)
DROP POLICY IF EXISTS "Anyone can read approved questions" ON questions;
CREATE POLICY "Anyone can read active questions"
  ON questions
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND (moderation_status = 'approved' OR moderation_status IS NULL));

-- Emergency fix complete
