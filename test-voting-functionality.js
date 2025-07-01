import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVotingFunctionality() {
  console.log("🗳️ Testing voting functionality and leaderboard system...\n");

  try {
    // Test 1: Get available questions for voting
    console.log("1. Getting available questions for voting...");
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("*")
      .eq("is_active", true)
      .eq("moderation_status", "approved")
      .limit(5);

    if (questionsError) {
      console.error("❌ Failed to get questions:", questionsError);
      return;
    }

    console.log(`✅ Found ${questions.length} questions available for voting`);

    if (questions.length === 0) {
      console.log("No questions available, creating test questions...");

      // Create test questions
      const testQuestions = [
        {
          text: "Should AI be regulated more strictly?",
          moderation_status: "approved",
          is_active: true,
          source: "test",
        },
        {
          text: "Is remote work better than office work?",
          moderation_status: "approved",
          is_active: true,
          source: "test",
        },
      ];

      const { data: newQuestions, error: createError } = await supabase
        .from("questions")
        .insert(testQuestions)
        .select();

      if (createError) {
        console.error("❌ Failed to create test questions:", createError);
        return;
      }

      console.log(`✅ Created ${newQuestions.length} test questions`);
      questions.push(...newQuestions);
    }

    // Test 2: Test voting on questions (YES votes)
    console.log("\n2. Testing YES votes on questions...");

    const testSessionId = `test-voting-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    for (let i = 0; i < Math.min(2, questions.length); i++) {
      const question = questions[i];
      const voteSessionId = `${testSessionId}-q${i}`;

      const { data: vote, error: voteError } = await supabase
        .from("votes")
        .insert({
          question_id: question.id,
          choice: "yes",
          session_id: voteSessionId,
          is_anonymous: true,
        })
        .select();

      if (voteError) {
        console.error(`❌ Failed to vote YES on question ${i + 1}:`, voteError);
      } else {
        console.log(
          `✅ Successfully voted YES on question ${
            i + 1
          }: "${question.text.substring(0, 50)}..."`
        );
      }
    }

    // Test 3: Test voting on questions (NO votes)
    console.log("\n3. Testing NO votes on questions...");

    for (let i = 0; i < Math.min(2, questions.length); i++) {
      const question = questions[i];
      const voteSessionId = `${testSessionId}-no-q${i}`;

      const { data: vote, error: voteError } = await supabase
        .from("votes")
        .insert({
          question_id: question.id,
          choice: "no",
          session_id: voteSessionId,
          is_anonymous: true,
        })
        .select();

      if (voteError) {
        console.error(`❌ Failed to vote NO on question ${i + 1}:`, voteError);
      } else {
        console.log(
          `✅ Successfully voted NO on question ${
            i + 1
          }: "${question.text.substring(0, 50)}..."`
        );
      }
    }

    // Test 4: Get vote counts for questions
    console.log("\n4. Checking vote counts for questions...");

    const { data: voteCounts, error: voteCountError } = await supabase
      .from("votes")
      .select("question_id, choice, count()", { count: "exact" })
      .in(
        "question_id",
        questions.map((q) => q.id)
      );

    if (voteCountError) {
      console.error("❌ Failed to get vote counts:", voteCountError);
    } else {
      console.log(`✅ Found votes in database`);

      // Get detailed vote breakdown
      for (const question of questions) {
        const { data: questionVotes, error } = await supabase
          .from("votes")
          .select("choice")
          .eq("question_id", question.id);

        if (!error && questionVotes) {
          const yesVotes = questionVotes.filter(
            (v) => v.choice === "yes"
          ).length;
          const noVotes = questionVotes.filter((v) => v.choice === "no").length;
          console.log(
            `   "${question.text.substring(
              0,
              40
            )}...": YES=${yesVotes}, NO=${noVotes}`
          );
        }
      }
    }

    // Test 5: Test trending topics voting and leaderboard
    console.log("\n5. Testing trending topics voting and leaderboard...");

    const { data: trendingTopics, error: trendingError } = await supabase
      .from("trending_topics")
      .select("*")
      .eq("is_active", true)
      .eq("is_safe", true)
      .limit(3);

    if (trendingError) {
      console.error("❌ Failed to get trending topics:", trendingError);
    } else {
      console.log(`✅ Found ${trendingTopics.length} trending topics`);

      // Vote on trending topics
      for (let i = 0; i < trendingTopics.length; i++) {
        const topic = trendingTopics[i];
        const trendSessionId = `${testSessionId}-trend-${i}`;

        const { data: trendVote, error: trendVoteError } = await supabase
          .from("trend_votes")
          .insert({
            trending_topic_id: topic.id,
            session_id: trendSessionId,
            is_anonymous: true,
          })
          .select();

        if (trendVoteError) {
          console.error(
            `❌ Failed to vote on trending topic ${i + 1}:`,
            trendVoteError
          );
        } else {
          console.log(
            `✅ Successfully voted on trending topic ${
              i + 1
            }: "${topic.question_text.substring(0, 40)}..."`
          );
        }
      }
    }

    // Test 6: Check leaderboard (trending topics ordered by vote count)
    console.log("\n6. Testing leaderboard functionality...");

    const { data: leaderboard, error: leaderboardError } = await supabase
      .from("trending_topics")
      .select("*")
      .eq("is_active", true)
      .eq("is_safe", true)
      .order("vote_count", { ascending: false })
      .order("trending_score", { ascending: false })
      .limit(10);

    if (leaderboardError) {
      console.error("❌ Failed to get leaderboard:", leaderboardError);
    } else {
      console.log(
        `✅ Leaderboard working - ${leaderboard.length} topics ranked by votes`
      );
      console.log("\n📊 Current Leaderboard:");
      leaderboard.forEach((topic, index) => {
        console.log(
          `   ${index + 1}. "${topic.question_text.substring(0, 50)}..." - ${
            topic.vote_count
          } votes (Score: ${topic.trending_score})`
        );
      });
    }

    // Test 7: Test duplicate vote prevention
    console.log("\n7. Testing duplicate vote prevention...");

    if (questions.length > 0) {
      const duplicateSessionId = `${testSessionId}-duplicate`;
      const question = questions[0];

      // First vote
      const { data: firstVote, error: firstError } = await supabase
        .from("votes")
        .insert({
          question_id: question.id,
          choice: "yes",
          session_id: duplicateSessionId,
          is_anonymous: true,
        })
        .select();

      if (firstError) {
        console.error("❌ First vote failed:", firstError);
      } else {
        console.log("✅ First vote successful");

        // Try duplicate vote (should fail)
        const { data: duplicateVote, error: duplicateError } = await supabase
          .from("votes")
          .insert({
            question_id: question.id,
            choice: "no",
            session_id: duplicateSessionId,
            is_anonymous: true,
          })
          .select();

        if (duplicateError && duplicateError.code === "23505") {
          console.log("✅ Duplicate vote prevention working correctly");
        } else if (duplicateError) {
          console.error("❌ Unexpected duplicate vote error:", duplicateError);
        } else {
          console.log("⚠️ Duplicate vote was allowed (this might be an issue)");
        }
      }
    }

    // Clean up test data
    console.log("\n8. Cleaning up test data...");
    await supabase
      .from("votes")
      .delete()
      .like("session_id", `${testSessionId}%`);
    await supabase
      .from("trend_votes")
      .delete()
      .like("session_id", `${testSessionId}%`);
    await supabase.from("questions").delete().eq("source", "test");

    console.log("✅ Test data cleaned up");
    console.log("\n🎉 Voting functionality test completed!");
  } catch (error) {
    console.error("❌ Unexpected error during voting test:", error);
  }
}

testVotingFunctionality().catch(console.error);
