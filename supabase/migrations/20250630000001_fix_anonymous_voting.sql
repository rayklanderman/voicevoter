/*
  # Fix Anonymous Voting Schema

  1. Changes
    - Add proper unique constraints for anonymous voting
    - Add session_id and is_anonymous columns if they don't exist
    - Update RLS policies to handle anonymous users
    - Add proper indexes for performance

  2. Security
    - Update RLS policies for anonymous voting
    - Ensure proper duplicate vote prevention
*/

-- Add columns if they don't exist (for compatibility with existing schema)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'votes' AND column_name = 'session_id') THEN
    ALTER TABLE votes ADD COLUMN session_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'votes' AND column_name = 'is_anonymous') THEN
    ALTER TABLE votes ADD COLUMN is_anonymous boolean DEFAULT false;
  END IF;
END $$;

-- Drop the old unique constraint that only covers authenticated users
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_question_id_user_id_key;

-- Add new constraints to handle both authenticated and anonymous users
-- For authenticated users: unique on (question_id, user_id) where user_id is not null
-- For anonymous users: unique on (question_id, session_id) where session_id is not null
CREATE UNIQUE INDEX IF NOT EXISTS votes_authenticated_unique 
  ON votes(question_id, user_id) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS votes_anonymous_unique 
  ON votes(question_id, session_id) 
  WHERE session_id IS NOT NULL AND user_id IS NULL;

-- Add check constraint to ensure either user_id or session_id is provided
ALTER TABLE votes 
  ADD CONSTRAINT votes_user_or_session_check 
  CHECK (
    (user_id IS NOT NULL AND session_id IS NULL AND is_anonymous = false) OR
    (user_id IS NULL AND session_id IS NOT NULL AND is_anonymous = true)
  );

-- Update RLS policies to handle anonymous users
DROP POLICY IF EXISTS "Authenticated users can insert votes" ON votes;

-- Allow both authenticated and anonymous users to insert votes
CREATE POLICY "Users can insert votes"
  ON votes
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- Authenticated users can only insert votes with their own user_id
    (auth.uid() IS NOT NULL AND auth.uid() = user_id AND is_anonymous = false) OR
    -- Anonymous users can insert votes with session_id
    (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND is_anonymous = true)
  );

-- Allow anonymous users to read their own votes
CREATE POLICY "Users can read own votes"
  ON votes
  FOR SELECT
  TO authenticated, anon
  USING (
    -- Authenticated users can read all votes (for totals) and their own votes
    auth.uid() IS NOT NULL OR
    -- Anonymous users can read all votes (for totals)
    auth.uid() IS NULL
  );

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_votes_session_id ON votes(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_is_anonymous ON votes(is_anonymous);
CREATE INDEX IF NOT EXISTS idx_votes_question_choice ON votes(question_id, choice);

-- Add comments for documentation
COMMENT ON COLUMN votes.session_id IS 'Session ID for anonymous users to prevent duplicate voting';
COMMENT ON COLUMN votes.is_anonymous IS 'Flag to indicate if this is an anonymous vote';
COMMENT ON CONSTRAINT votes_user_or_session_check ON votes IS 'Ensures either user_id (authenticated) or session_id (anonymous) is provided, but not both';
