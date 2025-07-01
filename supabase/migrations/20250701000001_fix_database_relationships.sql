-- Fix database relationships and constraints
-- Date: July 1, 2025

-- First, let's check if the foreign key relationship exists and create it if missing
DO $$
BEGIN
  -- Add foreign key relationship between trending_topics and questions if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trending_topics_questions_trending_topic_id_fkey'
    AND table_name = 'questions'
  ) THEN
    -- Add a trending_topic_id column to questions if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'questions' 
      AND column_name = 'trending_topic_id'
    ) THEN
      ALTER TABLE questions ADD COLUMN trending_topic_id uuid;
    END IF;
    
    -- Create the foreign key constraint
    ALTER TABLE questions 
    ADD CONSTRAINT trending_topics_questions_trending_topic_id_fkey 
    FOREIGN KEY (trending_topic_id) REFERENCES trending_topics(id) ON DELETE SET NULL;
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_questions_trending_topic_id ON questions(trending_topic_id);
  END IF;
END $$;

-- Fix duplicate vote issues by ensuring proper unique constraints
-- Drop existing unique constraints if they exist to recreate them properly
DO $$
BEGIN
  -- For authenticated users: unique constraint on question_id + user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'votes_question_user_unique'
    AND table_name = 'votes'
  ) THEN
    ALTER TABLE votes DROP CONSTRAINT votes_question_user_unique;
  END IF;

  -- For anonymous users: unique constraint on question_id + session_id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'votes_question_session_unique'
    AND table_name = 'votes'
  ) THEN
    ALTER TABLE votes DROP CONSTRAINT votes_question_session_unique;
  END IF;
END $$;

-- Create proper unique constraints to prevent duplicate votes
-- Unique constraint for authenticated users (question_id + user_id where user_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS votes_question_user_unique 
ON votes(question_id, user_id) 
WHERE user_id IS NOT NULL AND is_anonymous = false;

-- Unique constraint for anonymous users (question_id + session_id where session_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS votes_question_session_unique 
ON votes(question_id, session_id) 
WHERE session_id IS NOT NULL AND is_anonymous = true;

-- Create similar constraints for trend_votes table
CREATE UNIQUE INDEX IF NOT EXISTS trend_votes_topic_user_unique 
ON trend_votes(trending_topic_id, user_id) 
WHERE user_id IS NOT NULL AND is_anonymous = false;

CREATE UNIQUE INDEX IF NOT EXISTS trend_votes_topic_session_unique 
ON trend_votes(trending_topic_id, session_id) 
WHERE session_id IS NOT NULL AND is_anonymous = true;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_votes_question_id ON votes(question_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_session_id ON votes(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at);

CREATE INDEX IF NOT EXISTS idx_trend_votes_topic_id ON trend_votes(trending_topic_id);
CREATE INDEX IF NOT EXISTS idx_trend_votes_user_id ON trend_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_votes_session_id ON trend_votes(session_id);

CREATE INDEX IF NOT EXISTS idx_trending_topics_vote_count ON trending_topics(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_trending_score ON trending_topics(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_is_active ON trending_topics(is_active);

-- Ensure RLS policies are properly set up
-- Enable RLS on all tables if not already enabled
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Anyone can read approved questions" ON questions;
DROP POLICY IF EXISTS "Anyone can read votes" ON votes;
DROP POLICY IF EXISTS "Users can insert votes" ON votes;
DROP POLICY IF EXISTS "Anyone can read active trending topics" ON trending_topics;
DROP POLICY IF EXISTS "Anyone can insert trending topics" ON trending_topics;
DROP POLICY IF EXISTS "Anyone can read trend votes" ON trend_votes;
DROP POLICY IF EXISTS "Users can insert trend votes" ON trend_votes;

-- Recreate RLS policies
CREATE POLICY "Anyone can read approved questions"
  ON questions
  FOR SELECT
  TO anon, authenticated
  USING (moderation_status = 'approved');

CREATE POLICY "Anyone can read votes"
  ON votes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert votes"
  ON votes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Authenticated users must provide user_id and not session_id
    ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()) AND (session_id IS NULL) AND (is_anonymous = false)) OR
    -- Anonymous users must provide session_id and not user_id
    ((auth.uid() IS NULL) AND (user_id IS NULL) AND (session_id IS NOT NULL) AND (is_anonymous = true))
  );

CREATE POLICY "Anyone can read active trending topics"
  ON trending_topics
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND is_safe = true);

CREATE POLICY "Anyone can insert trending topics"
  ON trending_topics
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read trend votes"
  ON trend_votes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert trend votes"
  ON trend_votes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Authenticated users must provide user_id and not session_id
    ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()) AND (session_id IS NULL) AND (is_anonymous = false)) OR
    -- Anonymous users must provide session_id and not user_id
    ((auth.uid() IS NULL) AND (user_id IS NULL) AND (session_id IS NOT NULL) AND (is_anonymous = true))
  );

-- Create function to automatically update vote counts
CREATE OR REPLACE FUNCTION update_trending_topic_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE trending_topics 
    SET vote_count = vote_count + 1 
    WHERE id = NEW.trending_topic_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE trending_topics 
    SET vote_count = GREATEST(vote_count - 1, 0)
    WHERE id = OLD.trending_topic_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update vote counts
DROP TRIGGER IF EXISTS trending_topic_vote_count_trigger ON trend_votes;
CREATE TRIGGER trending_topic_vote_count_trigger
  AFTER INSERT OR DELETE ON trend_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_trending_topic_vote_count();

-- Add helpful comments
COMMENT ON TABLE questions IS 'Main voting questions with metadata and trending topic relationships';
COMMENT ON TABLE votes IS 'User votes with duplicate prevention for both authenticated and anonymous users';
COMMENT ON TABLE trending_topics IS 'AI-generated and scraped trending topics that become poll questions';
COMMENT ON TABLE trend_votes IS 'Votes on trending topics for the leaderboard system';

COMMENT ON COLUMN questions.trending_topic_id IS 'Links questions to their source trending topic';
COMMENT ON COLUMN votes.is_anonymous IS 'Distinguishes between authenticated and anonymous votes';
COMMENT ON COLUMN votes.session_id IS 'Session identifier for anonymous users to prevent duplicate votes';
