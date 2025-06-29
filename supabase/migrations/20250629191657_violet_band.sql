/*
  # Voice Voter Database Schema

  1. New Tables
    - `questions`
      - `id` (uuid, primary key)
      - `text` (text, not null) - The question text
      - `created_at` (timestamptz, default now())
    - `votes` 
      - `id` (uuid, primary key)
      - `question_id` (uuid, foreign key to questions)
      - `user_id` (uuid, foreign key to auth.users, nullable for anonymous votes)
      - `choice` (text, constrained to 'yes' or 'no')
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on both tables
    - Allow anyone to read questions and votes
    - Allow authenticated users to insert votes (tied to their user_id)
    - Prevent duplicate votes per user per question

  3. Indexes
    - Index on questions.created_at for efficient ordering
    - Index on votes.question_id for efficient vote counting
    - Index on votes.user_id for user vote lookups
    - Unique constraint on (question_id, user_id) to prevent duplicate votes

  4. Sample Data
    - Insert some fun sample questions to get started
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

-- Create policies for questions table
CREATE POLICY "Anyone can read questions"
  ON questions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create policies for votes table
CREATE POLICY "Anyone can read votes"
  ON votes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert votes"
  ON votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_question_id ON votes(question_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);

-- Insert sample questions
INSERT INTO questions (text) VALUES
  ('Is cereal soup? 🥣'),
  ('Should AI run the government? 🤖'),
  ('Would you marry a robot? 💍'),
  ('Is a hot dog a sandwich? 🌭'),
  ('Should pineapple be on pizza? 🍍'),
  ('Is water wet? 💧'),
  ('Should we colonize Mars? 🚀'),
  ('Is it better to be feared or loved? 👑')
ON CONFLICT DO NOTHING;