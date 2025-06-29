/*
  # Add INSERT policy for ai_topics table

  1. Security Changes
    - Add INSERT policy for ai_topics table to allow both authenticated and anonymous users to insert topics
    - This enables the generateNewTopics function to work properly when creating AI-generated topics

  2. Policy Details
    - Allows INSERT operations for both authenticated and anonymous users
    - This is necessary because the topic generation can happen from both user contexts
*/

-- Add INSERT policy for ai_topics table
CREATE POLICY "Anyone can insert AI topics"
  ON ai_topics
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);