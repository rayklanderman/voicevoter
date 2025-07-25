import { useState, useEffect, useCallback } from "react";
import {
  Crown,
  TrendingUp,
  Vote,
  Loader2,
  Trophy,
  RefreshCw,
  AlertCircle,
  Target,
  Globe,
  Zap,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  Settings,
} from "lucide-react";
import {
  getActiveTrendingTopics,
  TrendingTopic,
  TRENDING_SOURCES,
} from "../lib/trendingSystem";
import { automaticTrendingSystem } from "../lib/automaticTrendingSystem";
import {
  playTextWithFallback,
  AVAILABLE_VOICES,
  isElevenLabsConfigured,
} from "../lib/elevenLabs";

interface TrendingLeaderboardProps {
  compact?: boolean;
}

export default function TrendingLeaderboard({
  compact = false,
}: TrendingLeaderboardProps) {
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<{
    topicId: string;
    choice: "yes" | "no";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>("");

  // Voice-related state
  const [playingTopic, setPlayingTopic] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>(
    AVAILABLE_VOICES.rachel.id
  );
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const loadTrendingData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Loading trending data with forced refresh...");

      // Use getActiveTrendingTopics with cache busting
      const topics = await getActiveTrendingTopics();

      console.log("📊 Loaded trending topics:", topics.length, topics);
      setTrendingTopics(topics.slice(0, compact ? 6 : 20));

      // Load user votes for trending topics
      const { supabase, getSessionId } = await import("../lib/supabase");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let sessionId = null;
      if (!user) {
        sessionId = getSessionId();
      }

      // Get user's votes on trending topics
      let userVoteQuery = supabase
        .from("trend_votes")
        .select("trending_topic_id");

      if (user) {
        userVoteQuery = userVoteQuery.eq("user_id", user.id);
      } else if (sessionId) {
        userVoteQuery = userVoteQuery
          .eq("session_id", sessionId)
          .eq("is_anonymous", true);
      }

      const { data: userVoteData } = await userVoteQuery;
      const votedTopicIds =
        userVoteData?.map(
          (vote: { trending_topic_id: string }) => vote.trending_topic_id
        ) || [];
      setUserVotes(votedTopicIds);
    } catch (err) {
      console.error("Error loading trending data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load trending data"
      );
    } finally {
      setLoading(false);
    }
  }, [compact]);

  useEffect(() => {
    loadTrendingData();

    // Listen for automatic updates
    const handleTrendingUpdate = () => {
      console.log("🔄 Trending topics updated automatically, refreshing...");
      loadTrendingData();
      setLastUpdateTime(new Date().toLocaleTimeString());
    };

    window.addEventListener("trendingTopicsUpdated", handleTrendingUpdate);

    return () => {
      window.removeEventListener("trendingTopicsUpdated", handleTrendingUpdate);
    };
  }, [loadTrendingData]);

  const handleVote = async (topicId: string, choice: "yes" | "no") => {
    // Check if user has already voted on this topic
    if (userVotes.includes(topicId)) {
      setError("You have already voted on this topic");
      return;
    }

    setVoting({ topicId, choice });
    setError(null);

    try {
      // Import supabase client
      const { supabase } = await import("../lib/supabase");

      // Get current user or session
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Generate session ID for anonymous users using the same system as votes
      let sessionId = null;
      if (!user) {
        const { getSessionId } = await import("../lib/supabase");
        sessionId = getSessionId();
      }

      // Check if user has already voted (double-check at database level)
      let existingVoteQuery = supabase
        .from("trend_votes")
        .select("id")
        .eq("trending_topic_id", topicId);

      if (user) {
        existingVoteQuery = existingVoteQuery
          .eq("user_id", user.id)
          .eq("is_anonymous", false);
      } else if (sessionId) {
        existingVoteQuery = existingVoteQuery
          .eq("session_id", sessionId)
          .eq("is_anonymous", true);
      }

      const { data: existingVote, error: checkError } =
        await existingVoteQuery.maybeSingle();

      if (checkError) {
        console.error("Error checking existing vote:", checkError);
        setError("Failed to verify vote status");
        return;
      }

      if (existingVote) {
        setError("You have already voted on this topic");
        // Update local state to reflect this
        setUserVotes([...userVotes, topicId]);
        return;
      }

      // Vote directly on trending topics using trend_votes table
      const voteData = {
        trending_topic_id: topicId,
        user_id: user?.id || null,
        session_id: sessionId,
        is_anonymous: !user,
      };

      const { error: voteError } = await supabase
        .from("trend_votes")
        .insert(voteData);

      if (voteError) {
        console.error("Vote error:", voteError);

        // Handle different types of database errors
        if (
          voteError.code === "23505" ||
          voteError.message?.includes("duplicate")
        ) {
          // Unique constraint violation - user already voted
          setError("You have already voted on this topic");
          setUserVotes([...userVotes, topicId]);
        } else if (voteError.code === "42501") {
          // Permission denied
          setError("Please sign in to vote on trending topics");
        } else if (voteError.code === "23503") {
          // Foreign key constraint violation
          setError("This topic is no longer available for voting");
        } else {
          // Generic error
          setError("Failed to cast vote. Please try again.");
        }
        return;
      }

      // Update user votes and reload data
      setUserVotes([...userVotes, topicId]);
      await loadTrendingData();
    } catch (err) {
      console.error("Error voting:", err);
      setError("Failed to cast vote");
    } finally {
      setVoting(null);
    }
  };

  const handlePlayTopic = async (topic: TrendingTopic) => {
    if (playingTopic === topic.id) {
      // Stop audio if currently playing this topic
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingTopic(null);
      return;
    }

    setPlayingTopic(topic.id);
    setAudioError(null);

    try {
      // Create a natural reading text
      const readingText = `Trending topic: ${topic.question_text}. Context: ${
        topic.context || topic.raw_topic
      }`;

      const result = await playTextWithFallback(readingText, selectedVoice);

      console.log(`🎤 Audio result:`, result);

      if (!result.success) {
        setAudioError(result.message);
      }
    } catch (error) {
      console.error("Error playing topic:", error);
      setAudioError("Failed to play audio");
    } finally {
      setPlayingTopic(null);
    }
  };

  const handleManualRefresh = async () => {
    try {
      setLoading(true);
      setError(null);

      // Trigger manual update
      await automaticTrendingSystem.performTrendingUpdate("manual");
      await loadTrendingData();
      setLastUpdateTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error manually refreshing:", err);
      setError("Failed to refresh trending topics");
    } finally {
      setLoading(false);
    }
  };

  const getSourceInfo = (source: string) => {
    return (
      TRENDING_SOURCES[source as keyof typeof TRENDING_SOURCES] || {
        name: "Unknown",
        emoji: "❓",
        color: "from-gray-500 to-gray-600",
      }
    );
  };

  const getRankEmoji = (index: number) => {
    switch (index) {
      case 0:
        return "👑";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return `#${index + 1}`;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return "from-yellow-500 to-orange-500";
      case 1:
        return "from-slate-400 to-slate-500";
      case 2:
        return "from-orange-400 to-orange-500";
      default:
        return "from-blue-500 to-purple-500";
    }
  };

  if (loading && trendingTopics.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            Global Trending Leaderboard
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-slate-700/30 rounded-xl p-4 animate-pulse"
            >
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
              🏆 Global Trending Leaderboard
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              Vote Yes or No on today's trending questions • Real-time global
              polls
              {lastUpdateTime && (
                <span className="ml-2 text-green-400">
                  • Updated at {lastUpdateTime}
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-600/50 disabled:to-purple-600/50 text-white px-4 py-2 rounded-xl font-bold transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Updating...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </>
          )}
        </button>
      </div>

      {/* Auto-Update Notice */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <div className="flex items-center gap-3 text-blue-300">
          <Globe className="w-5 h-5" />
          <div className="flex-1">
            <p className="font-medium">
              🤖 Automatic Global Trending System Active
            </p>
            <p className="text-sm text-blue-400 mt-1">
              Topics auto-update every 3 hours from Reddit, GitHub, and news
              sources. Breaking news triggers immediate updates.
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">Next update:</p>
            <p className="text-blue-400">
              {automaticTrendingSystem.getTimeUntilNextUpdate()}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-500/10 text-red-300 p-4 rounded-xl text-sm border border-red-500/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Audio Error */}
      {audioError && (
        <div className="mb-6 bg-orange-500/10 text-orange-300 p-4 rounded-xl text-sm border border-orange-500/20 flex items-center gap-3">
          <VolumeX className="w-5 h-5 flex-shrink-0" />
          <span>{audioError}</span>
        </div>
      )}

      {/* Voice Settings - Only show if ElevenLabs is configured */}
      {isElevenLabsConfigured() && (
        <div className="mb-6 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-purple-300 font-bold">
                  🎙️ Premium Voice Settings
                </h3>
                <p className="text-purple-400 text-sm">
                  Choose your preferred AI voice for reading topics aloud
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowVoiceSelector(!showVoiceSelector)}
              className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Voice</span>
            </button>
          </div>

          {showVoiceSelector && (
            <div className="mt-4 pt-4 border-t border-purple-500/20">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(AVAILABLE_VOICES).map(([key, voice]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedVoice === voice.id
                        ? "bg-purple-600/30 border-purple-500 text-purple-200"
                        : "bg-purple-600/10 border-purple-500/30 text-purple-300 hover:bg-purple-600/20"
                    }`}
                  >
                    <div className="font-bold text-sm">{voice.name}</div>
                    <div className="text-xs opacity-80">
                      {voice.description}
                    </div>
                    <div className="text-xs opacity-60 mt-1">
                      {voice.gender} • {voice.accent}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {trendingTopics.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-6">🌍</div>
          <h3 className="text-2xl font-bold text-white mb-4">
            Global Trends Loading...
          </h3>
          <p className="text-slate-300 mb-8 text-lg max-w-2xl mx-auto">
            The automatic trending system is gathering the latest global topics
            from Reddit, GitHub, and news sources. This happens every 3 hours
            and responds immediately to breaking news.
          </p>
          <div className="flex items-center justify-center gap-4 text-slate-400">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>Auto-updates every 3h</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>Global sources</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Breaking news alerts</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingTopics.map((topic, index) => {
            const sourceInfo = getSourceInfo(topic.source);
            const hasVoted = userVotes.includes(topic.id);
            const isVoting = voting?.topicId === topic.id;
            const isVotingYes =
              voting?.topicId === topic.id && voting?.choice === "yes";
            const isVotingNo =
              voting?.topicId === topic.id && voting?.choice === "no";
            const rankEmoji = getRankEmoji(index);
            const rankColor = getRankColor(index);

            return (
              <div
                key={topic.id}
                className={`bg-slate-700/30 backdrop-blur-sm border rounded-xl p-6 transition-all duration-200 hover:bg-slate-700/50 relative overflow-hidden ${
                  hasVoted
                    ? "border-green-500/50 bg-green-500/10"
                    : index === 0
                    ? "border-yellow-500/50 bg-yellow-500/10"
                    : "border-slate-600/50 hover:border-slate-500/50"
                }`}
              >
                {/* Rank Badge */}
                <div
                  className={`absolute top-4 left-4 w-10 h-10 bg-gradient-to-r ${rankColor} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}
                >
                  {typeof rankEmoji === "string" && rankEmoji.includes("#") ? (
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

                {/* Play Topic Button */}
                <div className="mb-4">
                  <button
                    onClick={() => handlePlayTopic(topic)}
                    disabled={playingTopic === topic.id}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                      playingTopic === topic.id
                        ? "bg-blue-600/30 text-blue-300 border border-blue-500/50"
                        : "bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 hover:border-blue-500/50"
                    }`}
                  >
                    {playingTopic === topic.id ? (
                      <>
                        <VolumeX className="w-4 h-4" />
                        <span>Playing... (Click to stop)</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>🎙️ Listen to Topic</span>
                        {isElevenLabsConfigured() && (
                          <span className="text-xs bg-purple-500/20 px-2 py-1 rounded">
                            AI Voice
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleVote(topic.id, "yes")}
                    disabled={hasVoted || isVoting}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed text-sm ${
                      hasVoted
                        ? "bg-green-500/20 text-green-300 border border-green-500/30"
                        : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border border-green-500/20"
                    }`}
                  >
                    {isVotingYes ? (
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
                        <ThumbsUp className="w-4 h-4" />
                        <span>Yes</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleVote(topic.id, "no")}
                    disabled={hasVoted || isVoting}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed text-sm ${
                      hasVoted
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border border-red-500/20"
                    }`}
                  >
                    {isVotingNo ? (
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
                        <ThumbsDown className="w-4 h-4" />
                        <span>No</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Vote Progress Bar */}
                {trendingTopics.length > 1 && topic.vote_count > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-600/30">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Influence Level</span>
                      <span>
                        {Math.round(
                          (topic.vote_count /
                            Math.max(
                              ...trendingTopics.map((t) => t.vote_count)
                            )) *
                            100
                        )}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-slate-600/30 rounded-full h-2">
                      <div
                        className={`h-2 bg-gradient-to-r ${rankColor} rounded-full transition-all duration-500`}
                        style={{
                          width: `${Math.max(
                            5,
                            (topic.vote_count /
                              Math.max(
                                ...trendingTopics.map((t) => t.vote_count)
                              )) *
                              100
                          )}%`,
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
            <span className="font-bold">
              {trendingTopics.length} global topics
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="font-bold">{userVotes.length} your votes</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span className="font-bold">
              {trendingTopics.reduce((sum, topic) => sum + topic.vote_count, 0)}{" "}
              total votes
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
