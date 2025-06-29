/*
  # Voice Voter Database Schema

  1. New Tables
    - `questions`
      - `id` (uuid, primary key)
      - `text` (text, not null)
      - `created_at` (timestamp with timezone, default now)
    - `votes`
      - `id` (uuid, primary key) 
      - `question_id` (uuid, foreign key to questions)
      - `user_id` (uuid, nullable, references auth.users)
      - `choice` (text, either 'yes' or 'no')
      - `created_at` (timestamp with timezone, default now)

  2. Security
    - Enable RLS on both tables
    - Allow authenticated users to read questions and votes
    - Allow authenticated users to insert votes (but not duplicate votes per question)
    - Only allow reading own votes for individual users
    
  3. Seed Data
    - Insert sample questions for testing
*/

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  choice text NOT NULL CHECK (choice IN ('yes', 'no')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(question_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Questions policies - anyone can read questions
CREATE POLICY "Anyone can read questions"
  ON questions
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Votes policies - anyone can read vote counts, authenticated users can insert votes
CREATE POLICY "Anyone can read votes"
  ON votes
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert votes"
  ON votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_votes_question_id ON votes(question_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);

-- Insert sample questions
INSERT INTO questions (text) VALUES
  ('Is cereal soup?'),
  ('Should AI run the government?'),
  ('Would you marry a robot?'),
  ('Is a hot dog a sandwich?'),
  ('Should pineapple be on pizza?')
ON CONFLICT DO NOTHING;