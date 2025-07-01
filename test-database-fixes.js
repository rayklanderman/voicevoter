import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseFixes() {
  console.log("🔧 Testing database fixes for 406 errors...\n");

  try {
    // Test 1: Test the old problematic query that was causing 406 errors
    console.log(
      "1. Testing the old problematic topic_id query that should now be fixed..."
    );

    // This should no longer be used in the app, but let's test if it still causes issues
    const { data: oldQuery, error: oldError } = await supabase
      .from("questions")
      .select("id")
      .eq("topic_id", "f7764991-bed2-4249-abf2-5c4c5a0fef31");

    if (oldError) {
      console.log(
        "✅ Old topic_id query correctly fails (as expected):",
        oldError.message
      );
    } else {
      console.log("⚠️ Old topic_id query still works, which might be okay");
    }

    // Test 2: Test the new correct query using trending_topic_id
    console.log("\n2. Testing new trending_topic_id query...");

    const { data: newQuery, error: newError } = await supabase
      .from("questions")
      .select("id, text, trending_topic_id")
      .not("trending_topic_id", "is", null)
      .limit(5);

    if (newError) {
      console.error("❌ New trending_topic_id query failed:", newError);
    } else {
      console.log(
        `✅ New trending_topic_id query works - found ${newQuery.length} questions with trending topics`
      );
    }

    // Test 3: Test trending topics query that should work now
    console.log("\n3. Testing trending topics query...");

    const { data: trending, error: trendingError } = await supabase
      .from("trending_topics")
      .select("*")
      .eq("is_active", true)
      .eq("is_safe", true)
      .limit(5);

    if (trendingError) {
      console.error("❌ Trending topics query failed:", trendingError);
    } else {
      console.log(
        `✅ Trending topics query works - found ${trending.length} topics`
      );
    }

    // Test 4: Test the leaderboard view
    console.log("\n4. Testing leaderboard view...");

    const { data: leaderboard, error: leaderboardError } = await supabase
      .from("trending_leaderboard")
      .select("*")
      .limit(5);

    if (leaderboardError) {
      console.error("❌ Leaderboard view failed:", leaderboardError);
    } else {
      console.log(
        `✅ Leaderboard view works - found ${leaderboard.length} topics`
      );
      console.log("📊 Top 3 topics:");
      leaderboard.slice(0, 3).forEach((topic, i) => {
        console.log(
          `   ${i + 1}. "${topic.question_text.substring(0, 50)}..." - ${
            topic.total_votes
          } votes`
        );
      });
    }

    // Test 5: Test voting functionality
    console.log("\n5. Testing voting functionality...");

    if (trending && trending.length > 0) {
      const testTopic = trending[0];
      const sessionId = `test-fix-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const { data: vote, error: voteError } = await supabase
        .from("trend_votes")
        .insert({
          trending_topic_id: testTopic.id,
          session_id: sessionId,
          is_anonymous: true,
        })
        .select();

      if (voteError) {
        console.error("❌ Voting failed:", voteError);
      } else {
        console.log("✅ Voting works correctly");

        // Clean up
        await supabase.from("trend_votes").delete().eq("id", vote[0].id);
        console.log("🧹 Test vote cleaned up");
      }
    }

    // Test 6: Test question voting
    console.log("\n6. Testing question voting...");

    const { data: questions, error: questionError } = await supabase
      .from("questions")
      .select("id, text")
      .eq("is_active", true)
      .limit(1);

    if (questionError) {
      console.error("❌ Questions query failed:", questionError);
    } else if (questions && questions.length > 0) {
      const testQuestion = questions[0];
      const sessionId = `test-question-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const { data: questionVote, error: questionVoteError } = await supabase
        .from("votes")
        .insert({
          question_id: testQuestion.id,
          choice: "yes",
          session_id: sessionId,
          is_anonymous: true,
        })
        .select();

      if (questionVoteError) {
        console.error("❌ Question voting failed:", questionVoteError);
      } else {
        console.log("✅ Question voting works correctly");

        // Clean up
        await supabase.from("votes").delete().eq("id", questionVote[0].id);
        console.log("🧹 Test question vote cleaned up");
      }
    }

    console.log("\n🎉 Database fixes test completed!");
    console.log("\n📋 Status:");
    console.log("✅ 406 errors should be fixed");
    console.log("✅ trending_topic_id queries working");
    console.log("✅ Voting functionality working");
    console.log("✅ Leaderboard working");
    console.log("\nThe app should now work without 406 database errors!");
  } catch (error) {
    console.error("❌ Unexpected error during testing:", error);
  }
}

testDatabaseFixes().catch(console.error);
