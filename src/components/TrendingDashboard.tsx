import React, { useState, useEffect } from 'react';
import { Crown, TrendingUp, RefreshCw, Vote, Volume2, Loader2, Sparkles, AlertCircle, CheckCircle, Trophy, Plus, X } from 'lucide-react';
import { 
  generateTrendingTopics, 
  getActiveTrendingTopics, 
  voteForTrend, 
  getUserTrendVotes,
  getTodaysCrownedTrend,
  crownDailyTrend,
  TrendingTopic, 
  CrownedTrend,
  TRENDING_SOURCES 
} from '../lib/trendingSystem';
import { playText, speakWithBrowserTTS, getAudioServiceStatus } from '../lib/elevenLabs';

interface TrendingDashboardProps {
  onClose: () => void;
}

export default function TrendingDashboard({ onClose }: TrendingDashboardProps) {
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [crownedTrend, setCrownedTrend] = useState<CrownedTrend | null>(null);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);
  const [crowning, setCrowning] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleGenerateTopics = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const newTopics = await generateTrendingTopics();
      setSuccess(`Generated ${newTopics.length} new trending topics!`);
      await loadTrendingData();
    } catch (err) {
      console.error('Error generating topics:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate trending topics');
    } finally {
      setGenerating(false);
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
        setSuccess('Vote cast successfully!');
        await loadTrendingData();
      }
    } catch (err) {
      console.error('Error voting:', err);
      setError('Failed to cast vote');
    } finally {
      setVoting(null);
    }
  };

  const handleCrownTrend = async () => {
    setCrowning(true);
    setError(null);

    try {
      const crowned = await crownDailyTrend();
      if (crowned) {
        setCrownedTrend(crowned);
        setSuccess('Daily trend has been crowned! 👑');
      } else {
        setError('No trending topics with votes found for today');
      }
    } catch (err) {
      console.error('Error crowning trend:', err);
      setError(err instanceof Error ? err.message : 'Failed to crown daily trend');
    } finally {
      setCrowning(false);
    }
  };

  const handlePlayCrownedTrend = async () => {
    if (!crownedTrend?.voice_script) return;

    setPlayingAudio(true);
    setError(null);

    try {
      try {
        await playText(crownedTrend.voice_script);
      } catch (elevenLabsError) {
        console.warn('ElevenLabs failed, trying browser TTS:', elevenLabsError);
        await speakWithBrowserTTS(crownedTrend.voice_script);
      }
    } catch (err) {
      console.error('Audio playback failed:', err);
      setError('Failed to play audio');
    } finally {
      setPlayingAudio(false);
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
      case 0: return 'from-yellow-400 to-orange-500';
      case 1: return 'from-gray-300 to-gray-500';
      case 2: return 'from-orange-300 to-orange-500';
      default: return 'from-purple-400 to-purple-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-purple-200/50">
        {/* Header */}
        <div className="p-6 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-orange-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  🏆 Trending Topics Leaderboard
                </h2>
                <p className="text-purple-600 font-medium">
                  Vote for the most influential trending topic
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-purple-100 rounded-full transition-colors text-purple-600 text-xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-2xl text-sm border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 text-green-700 p-4 rounded-2xl text-sm border border-green-200 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Success!</p>
                <p>{success}</p>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={handleGenerateTopics}
              disabled={generating}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white px-6 py-3 rounded-full font-bold transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
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

            <button
              onClick={handleCrownTrend}
              disabled={crowning || trendingTopics.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-6 py-3 rounded-full font-bold transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
            >
              {crowning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Crowning...</span>
                </>
              ) : (
                <>
                  <Crown className="w-5 h-5" />
                  <span>Crown Daily Winner</span>
                </>
              )}
            </button>

            <div className="text-sm text-purple-600 bg-purple-100 px-4 py-2 rounded-full">
              📊 {trendingTopics.length} topics • {userVotes.length} votes cast
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-gradient-to-r from-purple-100 to-orange-100 rounded-2xl p-6 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-purple-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-6 bg-purple-200 rounded-full w-3/4 mb-2"></div>
                      <div className="h-4 bg-purple-200 rounded-full w-1/2"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-purple-200 rounded-full w-full mb-2"></div>
                  <div className="h-4 bg-purple-200 rounded-full w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Crowned Trend Section */}
              {crownedTrend && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-3xl animate-bounce">👑</div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                        🏆 Today's Crowned Trend
                      </h3>
                      <p className="text-orange-700 font-medium">
                        {crownedTrend.vote_count} votes • {new Date(crownedTrend.crowned_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {crownedTrend.trending_topic && (
                    <>
                      <h4 className="text-lg font-bold text-orange-900 mb-3">
                        {crownedTrend.trending_topic.question_text}
                      </h4>

                      <p className="text-orange-700 mb-4">
                        {crownedTrend.trending_topic.context}
                      </p>

                      <button
                        onClick={handlePlayCrownedTrend}
                        disabled={playingAudio}
                        className="flex items-center gap-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-3 rounded-2xl font-bold transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
                      >
                        {playingAudio ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Playing...</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-5 h-5" />
                            <span>🎙️ Hear Crown Announcement</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Trending Topics Leaderboard */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                  <h3 className="text-xl font-bold text-purple-900">
                    🏁 Live Leaderboard - Vote for Most Influential
                  </h3>
                </div>

                {trendingTopics.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🤔</div>
                    <h4 className="text-2xl font-bold text-purple-900 mb-4">No Trending Topics Yet</h4>
                    <p className="text-purple-700 mb-6">
                      Generate some trending topics to start the voting competition!
                    </p>
                    <button
                      onClick={handleGenerateTopics}
                      disabled={generating}
                      className="bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-200 transform hover:scale-105"
                    >
                      🚀 Generate Trending Topics
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trendingTopics.map((topic, index) => {
                      const sourceInfo = getSourceInfo(topic.source);
                      const hasVoted = userVotes.includes(topic.id);
                      const isVoting = voting === topic.id;
                      const rankEmoji = getRankEmoji(index);
                      const rankColor = getRankColor(index);

                      return (
                        <div
                          key={topic.id}
                          className={`bg-white/80 backdrop-blur-sm border-2 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg relative overflow-hidden ${
                            hasVoted 
                              ? 'border-green-300 bg-green-50/50' 
                              : index === 0
                              ? 'border-yellow-300 bg-yellow-50/50'
                              : 'border-purple-200/50 hover:border-purple-300'
                          }`}
                        >
                          {/* Rank Badge */}
                          <div className={`absolute top-4 left-4 w-10 h-10 bg-gradient-to-r ${rankColor} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}>
                            {typeof rankEmoji === 'string' && rankEmoji.includes('#') ? (
                              <span className="text-sm">{rankEmoji}</span>
                            ) : (
                              <span className="text-lg">{rankEmoji}</span>
                            )}
                          </div>

                          <div className="ml-14 flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{sourceInfo.emoji}</span>
                              <div>
                                <span className={`inline-flex items-center gap-2 bg-gradient-to-r ${sourceInfo.color} text-white px-3 py-1 rounded-full text-sm font-bold`}>
                                  {sourceInfo.name}
                                </span>
                                <span className="ml-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold">
                                  {topic.category}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2 text-lg font-bold text-purple-700">
                                <Vote className="w-5 h-5" />
                                <span>{topic.vote_count}</span>
                              </div>
                            </div>
                          </div>

                          <h4 className="text-lg font-bold text-purple-900 mb-3 leading-relaxed">
                            {topic.question_text}
                          </h4>

                          <p className="text-purple-700 mb-4 text-sm leading-relaxed">
                            {topic.context}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="text-sm text-purple-600">
                              📡 {topic.raw_topic.substring(0, 60)}...
                            </div>

                            <button
                              onClick={() => handleVote(topic.id)}
                              disabled={hasVoted || isVoting}
                              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 ${
                                hasVoted
                                  ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg'
                              }`}
                            >
                              {isVoting ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Voting...</span>
                                </>
                              ) : hasVoted ? (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Voted</span>
                                </>
                              ) : (
                                <>
                                  <Vote className="w-4 h-4" />
                                  <span>Vote Most Influential</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}