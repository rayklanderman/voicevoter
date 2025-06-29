/*
  # Crown the Trend System

  1. New Tables
    - `trending_topics` - stores scraped and AI-generated trending topics
    - `trend_votes` - stores user votes for trending topics  
    - `crowned_trends` - stores daily crowned trend winners

  2. Security
    - Enable RLS on all tables
    - Policies for anonymous and authenticated users
    - Unique constraints to prevent duplicate voting

  3. Functions
    - Auto-update vote counts with triggers
    - Crown daily trend selection function

  4. Indexes
    - Performance indexes for queries and sorting
*/

-- Create trending_topics table
CREATE TABLE IF NOT EXISTS trending_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL, -- 'x_twitter', 'facebook', 'reddit', etc.
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

-- Create trend_votes table (no foreign key to users table)
CREATE TABLE IF NOT EXISTS trend_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trending_topic_id uuid NOT NULL REFERENCES trending_topics(id) ON DELETE CASCADE,
  user_id uuid, -- References auth.users but no foreign key constraint
  session_id text,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create crowned_trends table (daily winners)
CREATE TABLE IF NOT EXISTS crowned_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trending_topic_id uuid NOT NULL REFERENCES trending_topics(id),
  vote_count integer NOT NULL,
  crowned_date date DEFAULT CURRENT_DATE,
  voice_script text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trending_topics_source ON trending_topics(source);
CREATE INDEX IF NOT EXISTS idx_trending_topics_active ON trending_topics(is_active);
CREATE INDEX IF NOT EXISTS idx_trending_topics_vote_count ON trending_topics(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_trending_score ON trending_topics(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_created_at ON trending_topics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trend_votes_topic ON trend_votes(trending_topic_id);
CREATE INDEX IF NOT EXISTS idx_trend_votes_user ON trend_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_votes_session ON trend_votes(session_id);

CREATE INDEX IF NOT EXISTS idx_crowned_trends_date ON crowned_trends(crowned_date DESC);

-- Add unique constraints to prevent duplicate votes
CREATE UNIQUE INDEX IF NOT EXISTS trend_votes_user_topic_unique 
  ON trend_votes(trending_topic_id, user_id) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS trend_votes_session_topic_unique 
  ON trend_votes(trending_topic_id, session_id) 
  WHERE session_id IS NOT NULL AND is_anonymous = true;

-- Ensure only one crowned trend per day
CREATE UNIQUE INDEX IF NOT EXISTS crowned_trends_date_unique ON crowned_trends(crowned_date);

-- Enable RLS on all new tables
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowned_trends ENABLE ROW LEVEL SECURITY;

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
    (user_id IS NOT NULL AND user_id = auth.uid() AND is_anonymous = false) OR
    (user_id IS NULL AND session_id IS NOT NULL AND is_anonymous = true)
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

-- Create function to update vote counts
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

-- Create function to crown daily trend
CREATE OR REPLACE FUNCTION crown_daily_trend()
RETURNS void AS $$
DECLARE
  top_trend_record RECORD;
  voice_script_text text;
BEGIN
  -- Get the top trending topic for today
  SELECT t.*, t.vote_count
  INTO top_trend_record
  FROM trending_topics t
  WHERE t.is_active = true 
    AND t.is_safe = true
    AND DATE(t.created_at) = CURRENT_DATE
  ORDER BY t.vote_count DESC, t.trending_score DESC
  LIMIT 1;

  -- If we found a trend and it has votes
  IF top_trend_record.id IS NOT NULL AND top_trend_record.vote_count > 0 THEN
    -- Create voice script
    voice_script_text := format(
      'Today''s crowned trend is: %s. Voted most influential by %s users. %s',
      top_trend_record.question_text,
      top_trend_record.vote_count,
      COALESCE(top_trend_record.context, 'This topic is trending across social media.')
    );

    -- Insert or update crowned trend for today
    INSERT INTO crowned_trends (trending_topic_id, vote_count, voice_script)
    VALUES (top_trend_record.id, top_trend_record.vote_count, voice_script_text)
    ON CONFLICT (crowned_date) 
    DO UPDATE SET 
      trending_topic_id = EXCLUDED.trending_topic_id,
      vote_count = EXCLUDED.vote_count,
      voice_script = EXCLUDED.voice_script;
  END IF;
END;
$$ LANGUAGE plpgsql;