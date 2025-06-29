import React, { useState, useEffect } from 'react';
import { Crown, TrendingUp, Vote, Loader2, Trophy, Zap, RefreshCw, AlertCircle, Plus, Target } from 'lucide-react';
import { 
  getActiveTrendingTopics, 
  voteForTrend, 
  getUserTrendVotes,
  generateTrendingTopics,
  TrendingTopic,
  TRENDING_SOURCES 
} from '../lib/trendingSystem';

interface TrendingLeaderboardProps {
  compact?: boolean;
}

export default function TrendingLeaderboard({ compact = false }: TrendingLeaderboardProps) {
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrendingData();
  }, []);

  const loadTrendingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [topics, votes] = await Promise.all([
        getActiveTrendingTopics(),
        getUserTrendVotes()
      ]);

      setTrendingTopics(topics.slice(0, 10));
      setUserVotes(votes);
    } catch (err) {
      console.error('Error loading trending data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trending data');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (topicId: string) => {
    setVoting(topicId);
    setError(null);

    try {
      const { error: voteError } = await voteForTrend(topicId);
      
      if (voteError) {
        setError(voteError);
      } else {
        await loadTrendingData();
      }
    } catch (err) {
      console.error('Error voting:', err);
      setError('Failed to cast vote');
    } finally {
      setVoting(null);
    }
  };

  const handleGenerateTopics = async () => {
    setGenerating(true);
    setError(null);

    try {
      await generateTrendingTopics();
      await loadTrendingData();
    } catch (err) {
      console.error('Error generating topics:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate trending topics');
    } finally {
      setGenerating(false);
    }
  };

  const getSourceInfo = (source: string) => {
    return TRENDING_SOURCES[source as keyof typeof TRENDING_SOURCES] || 
           { name: 'Unknown', emoji: '❓', color: 'from-gray-500 to-gray-600' };
  };

  const getRankEmoji = (index: number) => {
    switch (index) {
      case 0: return '👑';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${index + 1}`;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'from-yellow-500 to-orange-500';
      case 1: return 'from-slate-400 to-slate-500';
      case 2: return 'from-orange-400 to-orange-500';
      default: return 'from-blue-500 to-purple-500';
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            Trending Leaderboard
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-700/30 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-slate-600 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-600 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-600 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-3 bg-slate-600 rounded w-full mb-2"></div>
              <div className="h-3 bg-slate-600 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">
              Trending Leaderboard
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              Vote for the most influential trending topics • Top 10 global trends
            </p>
          </div>
        </div>
        
        <button
          onClick={handleGenerateTopics}
          disabled={generating}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-600/50 disabled:to-blue-600/50 text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {generating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              <span>Generate New Trends</span>
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-500/10 text-red-300 p-4 rounded-xl text-sm border border-red-500/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Leaderboard */}
      {trendingTopics.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-6">🤔</div>
          <h3 className="text-2xl font-bold text-white mb-4">No Trending Topics Yet</h3>
          <p className="text-slate-300 mb-8 text-lg max-w-2xl mx-auto">
            Generate some trending topics to start the global competition and see what's capturing the world's attention!
          </p>
          <button
            onClick={handleGenerateTopics}
            disabled={generating}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-600/50 disabled:to-blue-600/50 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
          >
            {generating ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span>Generating Trending Topics...</span>
              </>
            ) : (
              <>
                <Zap className="w-6 h-6" />
                <span>Generate Trending Topics</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingTopics.map((topic, index) => {
            const sourceInfo = getSourceInfo(topic.source);
            const hasVoted = userVotes.includes(topic.id);
            const isVoting = voting === topic.id;
            const rankEmoji = getRankEmoji(index);
            const rankColor = getRankColor(index);

            return (
              <div
                key={topic.id}
                className={`bg-slate-700/30 backdrop-blur-sm border rounded-xl p-6 transition-all duration-200 hover:bg-slate-700/50 relative overflow-hidden ${
                  hasVoted 
                    ? 'border-green-500/50 bg-green-500/10' 
                    : index === 0
                    ? 'border-yellow-500/50 bg-yellow-500/10'
                    : 'border-slate-600/50 hover:border-slate-500/50'
                }`}
              >
                {/* Rank Badge */}
                <div className={`absolute top-4 left-4 w-10 h-10 bg-gradient-to-r ${rankColor} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}>
                  {typeof rankEmoji === 'string' && rankEmoji.includes('#') ? (
                    <span className="text-sm">{rankEmoji}</span>
                  ) : (
                    <span className="text-xl">{rankEmoji}</span>
                  )}
                </div>

                <div className="ml-14 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{sourceInfo.emoji}</span>
                    <span className="bg-slate-600/50 text-slate-300 px-2 py-1 rounded-lg text-xs font-bold">
                      {topic.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                    <Vote className="w-4 h-4" />
                    <span>{topic.vote_count} votes</span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white mb-3 leading-relaxed line-clamp-3">
                  {topic.question_text}
                </h4>

                <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                  {topic.context || topic.raw_topic}
                </p>

                <div className="flex flex-wrap gap-1 mb-4">
                  {topic.keywords.slice(0, 3).map((keyword, i) => (
                    <span
                      key={i}
                      className="bg-slate-600/30 text-slate-300 px-2 py-1 rounded-lg text-xs font-medium"
                    >
                      #{keyword}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => handleVote(topic.id)}
                  disabled={hasVoted || isVoting}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed text-sm ${
                    hasVoted
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border border-orange-500/20'
                  }`}
                >
                  {isVoting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Voting...</span>
                    </>
                  ) : hasVoted ? (
                    <>
                      <span>Voted</span>
                      <span className="text-lg">✅</span>
                    </>
                  ) : (
                    <>
                      <Vote className="w-4 h-4" />
                      <span>Vote Most Influential</span>
                    </>
                  )}
                </button>

                {/* Vote Progress Bar */}
                {trendingTopics.length > 1 && topic.vote_count > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-600/30">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Influence Level</span>
                      <span>{Math.round((topic.vote_count / Math.max(...trendingTopics.map(t => t.vote_count))) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-600/30 rounded-full h-2">
                      <div 
                        className={`h-2 bg-gradient-to-r ${rankColor} rounded-full transition-all duration-500`}
                        style={{ 
                          width: `${Math.max(5, (topic.vote_count / Math.max(...trendingTopics.map(t => t.vote_count))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Footer */}
      {trendingTopics.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-700/50 flex items-center justify-center gap-8 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="font-bold">{trendingTopics.length} topics</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="font-bold">{userVotes.length} your votes</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span className="font-bold">{trendingTopics.reduce((sum, topic) => sum + topic.vote_count, 0)} total votes</span>
          </div>
        </div>
      )}
    </div>
  );
}