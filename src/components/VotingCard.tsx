import React, { useState, useEffect } from "react";
import {
  Check,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  Info,
  UserCheck,
  Users,
  Globe,
  Clock,
  Play,
  X,
} from "lucide-react";
import { useVotes } from "../hooks/useVotes";
import { useAuth } from "../hooks/useAuth";
import { playTextWithFallback, getAudioServiceStatus } from "../lib/elevenLabs";
import { getTrendingContext, TRENDING_SOURCES } from "../lib/trendingTopics";

interface VotingCardProps {
  questionId: string;
  questionText: string;
  questionSource?: string;
  createdAt?: string;
  onAuthRequired: () => void;
  isAuthenticated: boolean;
}

function VotingCard({
  questionId,
  questionText,
  questionSource = "manual",
  createdAt,
  onAuthRequired,
  isAuthenticated,
}: VotingCardProps) {
  const { votes, userVote, loading, castVote } = useVotes(questionId);
  const { user } = useAuth();
  const [voting, setVoting] = useState<"yes" | "no" | null>(null);
  const [votingError, setVotingError] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [audioMessage, setAudioMessage] = useState<string | null>(null);
  const [audioService, setAudioService] = useState(getAudioServiceStatus());

  useEffect(() => {
    setAudioService(getAudioServiceStatus());
  }, []);

  const handleVote = async (choice: "yes" | "no") => {
    setVoting(choice);
    setVotingError(null);
    try {
      const { error } = await castVote(choice);
      if (error) {
        console.error("Error voting:", error);
        setVotingError(error);
      }
    } catch (err) {
      console.error("Unexpected voting error:", err);
      setVotingError("An unexpected error occurred while voting");
    } finally {
      setVoting(null);
    }
  };

  const handleReadResults = async () => {
    if (votes.total === 0) {
      setAudioMessage(
        "No votes to read yet! Cast the first vote to hear results."
      );
      return;
    }

    setPlayingAudio(true);
    setAudioMessage(null);

    try {
      const yesPercentage = Math.round((votes.yes / votes.total) * 100);
      const noPercentage = Math.round((votes.no / votes.total) * 100);

      let resultText = "";

      if (questionSource?.startsWith("trending_")) {
        resultText = getTrendingContext(questionText, questionSource) + ". ";
      } else {
        resultText = `Here are the live results for today's question: "${questionText}". `;
      }

      resultText += `${yesPercentage} percent voted YES, and ${noPercentage} percent voted NO. 
        A total of ${votes.total} ${
        votes.total === 1 ? "person has" : "people have"
      } participated so far. 
        ${
          yesPercentage > noPercentage
            ? "YES is currently winning!"
            : noPercentage > yesPercentage
            ? "NO is currently winning!"
            : "It's a tie! Every vote counts."
        }`;

      // Use the enhanced playback function that tries ElevenLabs first
      const result = await playTextWithFallback(resultText);

      if (result.success) {
        setAudioMessage(`✅ ${result.message}`);
      } else {
        setAudioMessage(`❌ ${result.message}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Audio playback failed";
      setAudioMessage(`❌ ${errorMessage}`);
    } finally {
      setPlayingAudio(false);
    }
  };

  const yesPercentage = votes.total > 0 ? (votes.yes / votes.total) * 100 : 0;
  const noPercentage = votes.total > 0 ? (votes.no / votes.total) * 100 : 0;

  const getSourceInfo = () => {
    if (questionSource?.startsWith("trending_")) {
      const sourceKey = questionSource.replace("trending_", "");
      const sourceInfo = TRENDING_SOURCES[sourceKey];
      if (sourceInfo) {
        return {
          name: sourceInfo.name,
          emoji: sourceInfo.emoji,
          isTrending: true,
        };
      }
    }
    return {
      name: "Voice Voter",
      emoji: "🗳️",
      isTrending: false,
    };
  };

  const sourceInfo = getSourceInfo();

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-12 animate-pulse">
        <div className="h-8 bg-slate-700 rounded-lg w-3/4 mb-8 mx-auto"></div>
        <div className="flex gap-6 mb-8">
          <div className="h-16 bg-slate-700 rounded-xl flex-1"></div>
          <div className="h-16 bg-slate-700 rounded-xl flex-1"></div>
        </div>
        <div className="h-6 bg-slate-700 rounded-lg w-1/2 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 lg:p-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 bg-slate-700/50 px-6 py-3 rounded-xl mb-6 border border-slate-600/50">
          <Play className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">
            {sourceInfo.isTrending ? "Trending Poll" : "Question of the Day"}
          </h2>
        </div>
      </div>

      {/* Source and Timestamp */}
      {(sourceInfo.isTrending || createdAt) && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-center justify-center gap-3 text-blue-300">
            <Globe className="w-5 h-5" />
            <span className="font-medium">
              {sourceInfo.emoji} Sourced from {sourceInfo.name}
            </span>
            {createdAt && (
              <>
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  {new Date(createdAt).toLocaleDateString()} at{" "}
                  {new Date(createdAt).toLocaleTimeString()}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Question */}
      <div className="mb-10">
        <p className="text-2xl lg:text-3xl text-white text-center font-bold leading-relaxed">
          {questionText}
        </p>
      </div>

      {/* Voting Status */}
      <div className="mb-6 p-4 bg-slate-700/30 border border-slate-600/30 rounded-xl">
        <div className="flex items-center justify-center gap-3 text-slate-300">
          {isAuthenticated ? (
            <>
              <UserCheck className="w-5 h-5" />
              <span className="font-medium">Voting as: {user?.email}</span>
            </>
          ) : (
            <>
              <Users className="w-5 h-5" />
              <span className="font-medium">Voting anonymously</span>
              <button
                onClick={onAuthRequired}
                className="ml-2 text-blue-400 hover:text-blue-300 underline font-bold"
              >
                Sign in for personalized experience
              </button>
            </>
          )}
        </div>
      </div>

      {/* Audio Service Status */}
      {audioService.available && (
        <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-center gap-2 text-blue-300 text-sm">
            <Info className="w-4 h-4" />
            <span className="font-medium">{audioService.service}:</span>
            <span>{audioService.message}</span>
          </div>
        </div>
      )}

      {/* Voting Error */}
      {votingError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Voting Error:</p>
                <p>{votingError}</p>
              </div>
            </div>
            <button
              onClick={() => setVotingError(null)}
              className="text-red-400 hover:text-red-300 p-1"
              title="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Vote Confirmation */}
      {userVote ? (
        <div className="mb-8 p-6 bg-green-500/10 border border-green-500/20 rounded-xl">
          <div className="flex items-center justify-center gap-3 text-green-300">
            <Check className="w-6 h-6" />
            <span className="font-bold text-lg">
              You voted "{userVote.toUpperCase()}" - thanks for participating!
            </span>
          </div>
        </div>
      ) : (
        /* Voting Buttons */
        <div className="flex gap-6 mb-10">
          <button
            onClick={() => handleVote("yes")}
            disabled={voting !== null}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-green-600/50 disabled:to-emerald-600/50 text-white py-6 px-8 rounded-xl font-bold text-xl transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-green-500/20"
          >
            {voting === "yes" ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Voting...</span>
              </>
            ) : (
              <>
                <ThumbsUp className="w-7 h-7" />
                <span>Yes</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleVote("no")}
            disabled={voting !== null}
            className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 disabled:from-red-600/50 disabled:to-pink-600/50 text-white py-6 px-8 rounded-xl font-bold text-xl transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-red-500/20"
          >
            {voting === "no" ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Voting...</span>
              </>
            ) : (
              <>
                <ThumbsDown className="w-7 h-7" />
                <span>No</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {votes.total > 0 && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-2">Live Results</h3>
            <p className="text-slate-300 font-semibold">
              {votes.total} {votes.total === 1 ? "vote" : "votes"} cast so far
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="w-16 text-green-400 font-bold text-lg flex items-center gap-2">
                <span>Yes</span>
              </div>
              <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-1000 ease-out"
                  style={{ width: `${yesPercentage}%` }}
                ></div>
              </div>
              <div className="w-20 text-right font-bold text-lg text-white">
                {Math.round(yesPercentage)}%
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-16 text-red-400 font-bold text-lg flex items-center gap-2">
                <span>No</span>
              </div>
              <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-1000 ease-out"
                  style={{ width: `${noPercentage}%` }}
                ></div>
              </div>
              <div className="w-20 text-right font-bold text-lg text-white">
                {Math.round(noPercentage)}%
              </div>
            </div>
          </div>

          {/* Audio Message */}
          {audioMessage && (
            <div
              className={`p-4 rounded-xl text-sm border flex items-start gap-3 ${
                audioMessage.startsWith("✅")
                  ? "bg-green-500/10 text-green-300 border-green-500/20"
                  : "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
              }`}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Audio Status:</p>
                <p>{audioMessage}</p>
              </div>
            </div>
          )}

          {/* Read Results Button */}
          <div className="pt-6">
            <button
              onClick={handleReadResults}
              disabled={playingAudio || !audioService.available}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-600/50 disabled:to-purple-600/50 text-white py-4 px-8 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-blue-500/20"
            >
              {playingAudio ? (
                <>
                  <VolumeX className="w-6 h-6 animate-pulse" />
                  <span>Playing Results...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-6 h-6" />
                  <span>🎙️ Read Results Aloud</span>
                </>
              )}
            </button>

            {!audioService.available && (
              <p className="text-center text-sm text-slate-400 mt-2">
                Audio not available in this browser
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default VotingCard;
