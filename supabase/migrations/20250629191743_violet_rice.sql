/*
  # Voice Voter Database Schema

  1. New Tables
    - `questions`
      - `id` (uuid, primary key)
      - `text` (text, not null)
      - `created_at` (timestamp)
    - `votes`
      - `id` (uuid, primary key)
      - `question_id` (uuid, foreign key to questions)
      - `user_id` (uuid, foreign key to auth.users)
      - `choice` (text, 'yes' or 'no')
      - `created_at` (timestamp)
      - Unique constraint on (question_id, user_id)

  2. Security
    - Enable RLS on both tables
    - Allow anyone to read questions and votes
    - Only authenticated users can insert votes
    - Users can only vote with their own user_id

  3. Performance
    - Indexes on frequently queried columns
    - Sample questions for testing
*/

-- Create questions table if it doesn't exist
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create votes table if it doesn't exist
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  choice text NOT NULL CHECK (choice IN ('yes', 'no')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(question_id, user_id)
);

-- Enable Row Level Security (safe to run multiple times)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DO $$
BEGIN
  -- Drop and recreate questions policies
  DROP POLICY IF EXISTS "Anyone can read questions" ON questions;
  CREATE POLICY "Anyone can read questions"
    ON questions
    FOR SELECT
    TO anon, authenticated
    USING (true);

  -- Drop and recreate votes policies
  DROP POLICY IF EXISTS "Anyone can read votes" ON votes;
  CREATE POLICY "Anyone can read votes"
    ON votes
    FOR SELECT
    TO anon, authenticated
    USING (true);

  DROP POLICY IF EXISTS "Authenticated users can insert votes" ON votes;
  CREATE POLICY "Authenticated users can insert votes"
    ON votes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
END $$;

-- Create indexes for performance (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_question_id ON votes(question_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);

-- Insert sample questions (only if they don't already exist)
INSERT INTO questions (text) 
SELECT * FROM (VALUES
  ('Is cereal soup? 🥣'),
  ('Should AI run the government? 🤖'),
  ('Would you marry a robot? 💍'),
  ('Is a hot dog a sandwich? 🌭'),
  ('Should pineapple be on pizza? 🍍'),
  ('Is water wet? 💧'),
  ('Should we colonize Mars? 🚀'),
  ('Is it better to be feared or loved? 👑')
) AS new_questions(text)
WHERE NOT EXISTS (
  SELECT 1 FROM questions WHERE questions.text = new_questions.text
);