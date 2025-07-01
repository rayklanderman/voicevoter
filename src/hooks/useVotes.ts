import { useState, useEffect } from "react";
import { supabase, VoteCount, getSessionId } from "../lib/supabase";

export function useVotes(questionId: string | undefined) {
  const [votes, setVotes] = useState<VoteCount>({ yes: 0, no: 0, total: 0 });
  const [userVote, setUserVote] = useState<"yes" | "no" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!questionId) {
      setLoading(false);
      return;
    }

    async function fetchVotes() {
      try {
        setLoading(true);

        // Get vote counts with error handling
        const { data: votesData, error: votesError } = await supabase
          .from("votes")
          .select("choice")
          .eq("question_id", questionId);

        if (votesError) {
          console.error("Error fetching votes:", votesError);
          throw votesError;
        }

        const yesCount =
          votesData?.filter((vote) => vote.choice === "yes").length || 0;
        const noCount =
          votesData?.filter((vote) => vote.choice === "no").length || 0;
        const total = yesCount + noCount;

        setVotes({ yes: yesCount, no: noCount, total });

        // Check for existing vote (authenticated or anonymous)
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Check authenticated user's vote
          const { data: userVoteData, error: userVoteError } = await supabase
            .from("votes")
            .select("choice")
            .eq("question_id", questionId)
            .eq("user_id", user.id)
            .eq("is_anonymous", false)
            .maybeSingle();

          if (userVoteError) {
            console.error("Error fetching user vote:", userVoteError);
          } else {
            setUserVote(userVoteData?.choice || null);
          }
        } else {
          // Check anonymous user's vote using session ID
          const sessionId = getSessionId();
          const { data: anonVoteData, error: anonVoteError } = await supabase
            .from("votes")
            .select("choice")
            .eq("question_id", questionId)
            .eq("session_id", sessionId)
            .eq("is_anonymous", true)
            .maybeSingle();

          if (anonVoteError) {
            console.error("Error fetching anonymous vote:", anonVoteError);
          } else {
            setUserVote(anonVoteData?.choice || null);
          }
        }
      } catch (err) {
        console.error("Error in fetchVotes:", err);
        // Set default values on error
        setVotes({ yes: 0, no: 0, total: 0 });
        setUserVote(null);
      } finally {
        setLoading(false);
      }
    }

    fetchVotes();

    // Set up real-time subscription for live updates
    const subscription = supabase
      .channel(`votes_${questionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `question_id=eq.${questionId}`,
        },
        (payload) => {
          console.log("Real-time vote update:", payload);
          fetchVotes(); // Refresh votes when changes occur
        }
      )
      .subscribe((status) => {
        console.log("Votes subscription status:", status);
        if (status === "SUBSCRIPTION_ERROR") {
          console.error("Failed to subscribe to votes channel");
        }
      });

    return () => {
      console.log("Unsubscribing from votes channel");
      subscription.unsubscribe();
    };
  }, [questionId]);

  const castVote = async (choice: "yes" | "no") => {
    if (!questionId) return { error: "No question selected" };

    // Check if user has already voted
    if (userVote) {
      return { error: "You have already voted on this question" };
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Auth error during vote:", authError);
        return { error: "Authentication error. Please try again." };
      }

      if (user) {
        // Authenticated vote
        const { error } = await supabase.from("votes").insert({
          question_id: questionId,
          user_id: user.id,
          choice,
          is_anonymous: false,
          session_id: null,
        });

        if (error) {
          console.error("Authenticated vote insertion error:", error);

          if (error.code === "23505") {
            // Unique constraint violation
            return { error: "You have already voted on this question" };
          }

          // Handle other specific database errors
          if (error.code === "23503") {
            // Foreign key violation
            return { error: "Invalid question or user data" };
          }

          if (error.code === "23514") {
            // Check constraint violation
            return { error: "Invalid vote choice" };
          }

          return { error: `Database error: ${error.message}` };
        }
      } else {
        // Anonymous vote
        const sessionId = getSessionId();

        if (!sessionId) {
          return { error: "Unable to create anonymous session" };
        }

        const { error } = await supabase.from("votes").insert({
          question_id: questionId,
          user_id: null,
          session_id: sessionId,
          choice,
          is_anonymous: true,
        });

        if (error) {
          console.error("Anonymous vote insertion error:", error);

          if (error.code === "23505") {
            // Unique constraint violation
            return { error: "You have already voted on this question" };
          }

          // Handle other specific database errors
          if (error.code === "23503") {
            // Foreign key violation
            return { error: "Invalid question data" };
          }

          if (error.code === "23514") {
            // Check constraint violation
            return { error: "Invalid vote data or choice" };
          }

          return { error: `Database error: ${error.message}` };
        }
      }

      // Update local state immediately for better UX
      setUserVote(choice);

      // Update vote counts optimistically
      setVotes((prev) => ({
        yes: choice === "yes" ? prev.yes + 1 : prev.yes,
        no: choice === "no" ? prev.no + 1 : prev.no,
        total: prev.total + 1,
      }));

      console.log(
        "Vote cast successfully:",
        choice,
        user ? "authenticated" : "anonymous"
      );
      return { error: null };
    } catch (err) {
      console.error("Unexpected error casting vote:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      return {
        error: `An unexpected error occurred while voting: ${errorMessage}`,
      };
    }
  };

  return {
    votes,
    userVote,
    loading,
    castVote,
  };
}
