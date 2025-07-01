-- Fix vote count aggregation and ensure triggers are working
-- Date: July 1, 2025

-- First, let's manually update all vote counts for trending topics
UPDATE trending_topics 
SET vote_count = (
  SELECT COUNT(*) 
  FROM trend_votes 
  WHERE trend_votes.trending_topic_id = trending_topics.id
);

-- Create a function to update question vote counts
CREATE OR REPLACE FUNCTION update_question_vote_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be used later for question statistics
  -- For now, we'll focus on trending topics
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Make sure the trending topic vote count trigger is working
DROP TRIGGER IF EXISTS trending_topic_vote_count_trigger ON trend_votes;
CREATE TRIGGER trending_topic_vote_count_trigger
  AFTER INSERT OR DELETE ON trend_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_trending_topic_vote_count();

-- Also ensure we have a trigger for updates (though we don't expect vote updates)
DROP TRIGGER IF EXISTS trigger_update_vote_count ON trend_votes;
CREATE TRIGGER trigger_update_vote_count
  AFTER INSERT OR DELETE ON trend_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_trending_topic_vote_count();

-- Create a view for easy leaderboard queries
CREATE OR REPLACE VIEW trending_leaderboard AS
SELECT 
  t.*,
  COALESCE(vote_count, 0) as total_votes,
  ROW_NUMBER() OVER (ORDER BY COALESCE(vote_count, 0) DESC, trending_score DESC, created_at DESC) as rank
FROM trending_topics t
WHERE is_active = true AND is_safe = true
ORDER BY COALESCE(vote_count, 0) DESC, trending_score DESC, created_at DESC;

-- Create a view for question vote statistics
CREATE OR REPLACE VIEW question_vote_stats AS
SELECT 
  q.*,
  COALESCE(yes_votes.count, 0) as yes_votes,
  COALESCE(no_votes.count, 0) as no_votes,
  COALESCE(yes_votes.count, 0) + COALESCE(no_votes.count, 0) as total_votes
FROM questions q
LEFT JOIN (
  SELECT question_id, COUNT(*) as count
  FROM votes 
  WHERE choice = 'yes'
  GROUP BY question_id
) yes_votes ON q.id = yes_votes.question_id
LEFT JOIN (
  SELECT question_id, COUNT(*) as count
  FROM votes 
  WHERE choice = 'no'
  GROUP BY question_id
) no_votes ON q.id = no_votes.question_id
WHERE q.is_active = true AND q.moderation_status = 'approved';

-- Grant access to these views
GRANT SELECT ON trending_leaderboard TO anon, authenticated;
GRANT SELECT ON question_vote_stats TO anon, authenticated;

-- Add comments for documentation
COMMENT ON VIEW trending_leaderboard IS 'Real-time leaderboard of trending topics ranked by vote count';
COMMENT ON VIEW question_vote_stats IS 'Question voting statistics with yes/no vote counts';
