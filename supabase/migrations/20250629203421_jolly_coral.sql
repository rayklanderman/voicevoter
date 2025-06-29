/*
  # Complete Database Schema Fix

  This migration ensures all tables, relationships, and functions are properly set up
  for the Voice Voter application with trending topics functionality.

  ## Tables Created:
  1. questions - Main voting questions
  2. votes - User votes on questions  
  3. trending_topics - Scraped trending topics for voting
  4. trend_votes - Votes on trending topics
  5. crowned_trends - Daily crowned trending topics
  6. topic_categories - Categories for AI topics
  7. ai_topics - AI-generated topics

  ## Security:
  - RLS enabled on all tables
  - Appropriate policies for anonymous and authenticated users
  - Unique constraints to prevent duplicate votes

  ## Functions:
  - Auto-update vote counts via triggers
  - Crown daily trending topics
*/

-- Create questions table with all required columns
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  topic_id uuid,
  source text DEFAULT 'manual',
  is_trending boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  moderation_status text DEFAULT 'approved',
  trending_score integer DEFAULT 0
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  user_id uuid,
  choice text NOT NULL CHECK (choice IN ('yes', 'no')),
  created_at timestamptz DEFAULT now(),
  session_id text,
  is_anonymous boolean DEFAULT false
);

-- Create trending_topics table
CREATE TABLE IF NOT EXISTS trending_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  raw_topic text NOT NULL,
  summary text,
  question_text text NOT NULL,
  context text,
  category text DEFAULT 'General',
  keywords text[] DEFAULT '{}',
  trending_score integer DEFAULT 0,
  vote_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_safe boolean DEFAULT true,
  moderation_notes text,
  scraped_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create trend_votes table
CREATE TABLE IF NOT EXISTS trend_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trending_topic_id uuid NOT NULL REFERENCES trending_topics(id) ON DELETE CASCADE,
  user_id uuid,
  session_id text,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create crowned_trends table
CREATE TABLE IF NOT EXISTS crowned_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trending_topic_id uuid NOT NULL REFERENCES trending_topics(id),
  vote_count integer NOT NULL,
  crowned_date date DEFAULT CURRENT_DATE,
  voice_script text,
  created_at timestamptz DEFAULT now()
);

-- Create topic_categories table
CREATE TABLE IF NOT EXISTS topic_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  emoji text DEFAULT '📊',
  created_at timestamptz DEFAULT now()
);

-- Create ai_topics table
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

-- Add foreign key constraints
DO $$
BEGIN
  -- Add foreign key for questions.topic_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'questions_topic_id_fkey'
  ) THEN
    ALTER TABLE questions ADD CONSTRAINT questions_topic_id_fkey 
    FOREIGN KEY (topic_id) REFERENCES ai_topics(id);
  END IF;

  -- Add foreign key for votes.question_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'votes_question_id_fkey'
  ) THEN
    ALTER TABLE votes ADD CONSTRAINT votes_question_id_fkey 
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_source ON questions(source);
CREATE INDEX IF NOT EXISTS idx_questions_moderation ON questions(moderation_status);
CREATE INDEX IF NOT EXISTS idx_questions_trending ON questions(is_trending);
CREATE INDEX IF NOT EXISTS idx_questions_trending_score ON questions(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);

CREATE INDEX IF NOT EXISTS idx_votes_question_id ON votes(question_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_session ON votes(session_id);

CREATE INDEX IF NOT EXISTS idx_trending_topics_source ON trending_topics(source);
CREATE INDEX IF NOT EXISTS idx_trending_topics_active ON trending_topics(is_active);
CREATE INDEX IF NOT EXISTS idx_trending_topics_vote_count ON trending_topics(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_trending_score ON trending_topics(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_created_at ON trending_topics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trend_votes_topic ON trend_votes(trending_topic_id);
CREATE INDEX IF NOT EXISTS idx_trend_votes_user ON trend_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_votes_session ON trend_votes(session_id);

CREATE INDEX IF NOT EXISTS idx_crowned_trends_date ON crowned_trends(crowned_date DESC);

CREATE INDEX IF NOT EXISTS idx_ai_topics_active ON ai_topics(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_topics_category ON ai_topics(category_id);
CREATE INDEX IF NOT EXISTS idx_ai_topics_trending_score ON ai_topics(trending_score DESC);

-- Add unique constraints to prevent duplicate votes
CREATE UNIQUE INDEX IF NOT EXISTS votes_question_user_unique 
  ON votes(question_id, user_id) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS votes_question_session_unique 
  ON votes(question_id, session_id) 
  WHERE session_id IS NOT NULL AND is_anonymous = true;

CREATE UNIQUE INDEX IF NOT EXISTS trend_votes_user_topic_unique 
  ON trend_votes(trending_topic_id, user_id) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS trend_votes_session_topic_unique 
  ON trend_votes(trending_topic_id, session_id) 
  WHERE session_id IS NOT NULL AND is_anonymous = true;

CREATE UNIQUE INDEX IF NOT EXISTS crowned_trends_date_unique ON crowned_trends(crowned_date);

-- Enable RLS on all tables
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowned_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_topics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can read questions" ON questions;
DROP POLICY IF EXISTS "Anyone can read approved questions" ON questions;
DROP POLICY IF EXISTS "Anyone can insert questions" ON questions;
DROP POLICY IF EXISTS "Anyone can insert votes" ON votes;
DROP POLICY IF EXISTS "Anyone can read votes" ON votes;

-- RLS Policies for questions
CREATE POLICY "Anyone can read approved questions"
  ON questions
  FOR SELECT
  TO anon, authenticated
  USING (moderation_status = 'approved');

CREATE POLICY "Anyone can insert questions"
  ON questions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS Policies for votes
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
    ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()) AND (is_anonymous = false)) OR
    ((auth.uid() IS NULL) AND (user_id IS NULL) AND (session_id IS NOT NULL) AND (is_anonymous = true))
  );

-- RLS Policies for trending_topics
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

-- RLS Policies for trend_votes
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
    ((user_id IS NOT NULL) AND (user_id = auth.uid()) AND (is_anonymous = false)) OR
    ((user_id IS NULL) AND (session_id IS NOT NULL) AND (is_anonymous = true))
  );

-- RLS Policies for crowned_trends
CREATE POLICY "Anyone can read crowned trends"
  ON crowned_trends
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "System can insert crowned trends"
  ON crowned_trends
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS Policies for topic_categories
CREATE POLICY "Anyone can read topic categories"
  ON topic_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies for ai_topics
CREATE POLICY "Anyone can read active AI topics"
  ON ai_topics
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Anyone can insert AI topics"
  ON ai_topics
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create function to update trending topic vote counts
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
    SET vote_count = vote_count - 1 
    WHERE id = OLD.trending_topic_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update vote counts
DROP TRIGGER IF EXISTS trigger_update_vote_count ON trend_votes;
CREATE TRIGGER trigger_update_vote_count
  AFTER INSERT OR DELETE ON trend_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_trending_topic_vote_count();

-- Insert default topic categories
INSERT INTO topic_categories (name, description, emoji) VALUES
  ('Technology', 'Tech trends, AI, gadgets, and innovation', '💻'),
  ('Politics', 'Political news, elections, and governance', '🏛️'),
  ('Environment', 'Climate change, sustainability, and nature', '🌍'),
  ('Health', 'Medical breakthroughs, wellness, and fitness', '🏥'),
  ('Entertainment', 'Movies, music, celebrities, and pop culture', '🎬'),
  ('Sports', 'Athletic competitions, teams, and achievements', '⚽'),
  ('Economy', 'Financial markets, business, and economics', '💰'),
  ('Science', 'Research, discoveries, and scientific advances', '🔬'),
  ('Social Issues', 'Society, culture, and human rights', '👥'),
  ('Lifestyle', 'Fashion, food, travel, and daily life', '✨')
ON CONFLICT (name) DO NOTHING;

-- Insert sample questions to get started
INSERT INTO questions (text, source, is_trending) VALUES
  ('Should artificial intelligence be regulated by governments worldwide?', 'manual', false),
  ('Is remote work more productive than traditional office work?', 'manual', false),
  ('Should social media platforms be held responsible for misinformation?', 'manual', false)
ON CONFLICT DO NOTHING;