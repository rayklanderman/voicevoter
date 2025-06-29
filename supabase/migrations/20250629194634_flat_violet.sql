/*
  # AI Topics and Anonymous Voting Enhancement

  1. New Tables
    - `ai_topics` - Stores AI-generated trending topics
    - `topic_categories` - Categories for organizing topics
    
  2. Modified Tables
    - `questions` - Add topic_id and source fields
    - `votes` - Make user_id nullable for anonymous voting
    
  3. Security
    - Enable RLS on new tables
    - Add policies for anonymous voting
    - Add policies for AI topic management
    
  4. Changes
    - Support for anonymous voting
    - AI-generated topic tracking
    - Topic categorization system
*/

-- Create topic categories table
CREATE TABLE IF NOT EXISTS topic_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  emoji text DEFAULT '📊',
  created_at timestamptz DEFAULT now()
);

-- Create AI topics table
CREATE TABLE IF NOT EXISTS ai_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES topic_categories(id),
  trending_score integer DEFAULT 0,
  source text DEFAULT 'together_ai',
  keywords text[],
  generated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to questions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'topic_id'
  ) THEN
    ALTER TABLE questions ADD COLUMN topic_id uuid REFERENCES ai_topics(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'source'
  ) THEN
    ALTER TABLE questions ADD COLUMN source text DEFAULT 'manual';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'is_trending'
  ) THEN
    ALTER TABLE questions ADD COLUMN is_trending boolean DEFAULT false;
  END IF;
END $$;

-- Modify votes table to support anonymous voting (user_id already nullable)
-- Add session tracking for anonymous users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'votes' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE votes ADD COLUMN session_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'votes' AND column_name = 'is_anonymous'
  ) THEN
    ALTER TABLE votes ADD COLUMN is_anonymous boolean DEFAULT false;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE topic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_topics ENABLE ROW LEVEL SECURITY;

-- Policies for topic_categories
CREATE POLICY "Anyone can read topic categories"
  ON topic_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policies for ai_topics
CREATE POLICY "Anyone can read active AI topics"
  ON ai_topics
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Update votes policies to support anonymous voting
DROP POLICY IF EXISTS "Authenticated users can insert votes" ON votes;
DROP POLICY IF EXISTS "Anyone can read votes" ON votes;

CREATE POLICY "Anyone can read votes"
  ON votes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert votes"
  ON votes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- For authenticated users, user_id must match
    (auth.uid() IS NOT NULL AND user_id = auth.uid() AND is_anonymous = false)
    OR
    -- For anonymous users, must have session_id and no user_id
    (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND is_anonymous = true)
  );

-- Update unique constraint to handle anonymous voting
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_question_id_user_id_key;

-- Create new unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS votes_question_user_unique 
  ON votes (question_id, user_id) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS votes_question_session_unique 
  ON votes (question_id, session_id) 
  WHERE session_id IS NOT NULL AND is_anonymous = true;

-- Insert default topic categories
INSERT INTO topic_categories (name, description, emoji) VALUES
  ('Technology', 'Tech trends, AI, gadgets, and digital innovation', '💻'),
  ('Politics', 'Current political events and policy discussions', '🏛️'),
  ('Environment', 'Climate change, sustainability, and green initiatives', '🌍'),
  ('Health', 'Public health, wellness, and medical breakthroughs', '🏥'),
  ('Entertainment', 'Movies, music, celebrities, and pop culture', '🎬'),
  ('Sports', 'Athletic events, teams, and sporting news', '⚽'),
  ('Economy', 'Financial markets, business, and economic trends', '💰'),
  ('Science', 'Scientific discoveries and research', '🔬'),
  ('Social Issues', 'Community topics and social movements', '🤝'),
  ('Lifestyle', 'Fashion, food, travel, and daily life', '✨')
ON CONFLICT (name) DO NOTHING;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_topics_trending_score ON ai_topics (trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_topics_category ON ai_topics (category_id);
CREATE INDEX IF NOT EXISTS idx_ai_topics_active ON ai_topics (is_active);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions (topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_trending ON questions (is_trending);
CREATE INDEX IF NOT EXISTS idx_votes_session ON votes (session_id);