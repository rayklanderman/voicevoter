-- Add foreign key relationship to fix the database error
-- This migration adds the missing foreign key that the application expects

-- First, let's add a trending_topic_id column to questions table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'trending_topic_id') THEN
    ALTER TABLE questions ADD COLUMN trending_topic_id uuid;
  END IF;
END $$;

-- Add the foreign key constraint that the application is looking for
DO $$
BEGIN
  -- Check if the constraint doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trending_topics_questions_trending_topic_id_fkey'
  ) THEN
    ALTER TABLE questions 
    ADD CONSTRAINT trending_topics_questions_trending_topic_id_fkey 
    FOREIGN KEY (trending_topic_id) REFERENCES trending_topics(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_questions_trending_topic_id ON questions(trending_topic_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON questions TO anon;
