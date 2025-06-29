import { useState, useEffect } from 'react';
import { 
  getActiveTrendingTopics, 
  getUserTrendVotes, 
  getTodaysCrownedTrend,
  TrendingTopic, 
  CrownedTrend 
} from '../lib/trendingSystem';

export function useTrendingTopics() {
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [crownedTrend, setCrownedTrend] = useState<CrownedTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrendingData();
  }, []);

  const loadTrendingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [topics, votes, crowned] = await Promise.all([
        getActiveTrendingTopics(),
        getUserTrendVotes(),
        getTodaysCrownedTrend()
      ]);

      setTrendingTopics(topics);
      setUserVotes(votes);
      setCrownedTrend(crowned);
    } catch (err) {
      console.error('Error loading trending data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trending data');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    loadTrendingData();
  };

  return {
    trendingTopics,
    userVotes,
    crownedTrend,
    loading,
    error,
    refresh
  };
}