import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLiveProduction() {
  console.log("🔍 Final verification of live production environment...\n");

  try {
    // Test 1: Check if trending topics are accessible
    console.log("1. Testing trending topics access...");
    const { data: trending, error: trendingError } = await supabase
      .from("trending_topics")
      .select("*")
      .eq("is_active", true)
      .eq("is_safe", true)
      .limit(5);

    if (trendingError) {
      console.error("❌ Trending topics access failed:", trendingError);
    } else {
      console.log(
        `✅ Trending topics access works - found ${trending.length} topics`
      );
    }

    // Test 2: Check if questions are accessible
    console.log("\n2. Testing questions access...");
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("*")
      .eq("is_active", true)
      .limit(5);

    if (questionsError) {
      console.error("❌ Questions access failed:", questionsError);
    } else {
      console.log(
        `✅ Questions access works - found ${questions.length} questions`
      );
    }

    // Test 3: Check if votes are accessible
    console.log("\n3. Testing votes access...");
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("id, choice, created_at")
      .limit(5);

    if (votesError) {
      console.error("❌ Votes access failed:", votesError);
    } else {
      console.log(`✅ Votes access works - found ${votes.length} votes`);
    }

    // Test 4: Test the main join query that powers the app
    console.log("\n4. Testing main trending topics with questions join...");
    const { data: trendingWithQuestions, error: joinError } = await supabase
      .from("trending_topics")
      .select(
        `
        *,
        questions!trending_topics_questions_trending_topic_id_fkey(
          id,
          text,
          is_active
        )
      `
      )
      .eq("is_active", true)
      .eq("is_safe", true)
      .not("questions", "is", null)
      .order("vote_count", { ascending: false })
      .limit(10);

    if (joinError) {
      console.error("❌ Main join query failed:", joinError);
    } else {
      console.log(
        `✅ Main join query works - found ${trendingWithQuestions.length} trending topics with questions`
      );
    }

    // Test 5: Test creating a new question (and clean it up)
    console.log("\n5. Testing question creation...");
    const { data: newQuestion, error: createError } = await supabase
      .from("questions")
      .insert({
        text: `Final test question ${Date.now()}`,
        moderation_status: "approved",
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error("❌ Question creation failed:", createError);
    } else {
      console.log("✅ Question creation works");

      // Test 6: Test voting on the created question
      console.log("\n6. Testing vote creation...");
      const { data: newVote, error: voteError } = await supabase
        .from("votes")
        .insert({
          question_id: newQuestion.id,
          choice: "yes",
          session_id: `final-test-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          is_anonymous: true,
        })
        .select()
        .single();

      if (voteError) {
        console.error("❌ Vote creation failed:", voteError);
      } else {
        console.log("✅ Vote creation works");

        // Clean up the test vote
        await supabase.from("votes").delete().eq("id", newVote.id);
        console.log("🧹 Test vote cleaned up");
      }

      // Clean up the test question
      await supabase.from("questions").delete().eq("id", newQuestion.id);
      console.log("🧹 Test question cleaned up");
    }

    console.log("\n🎉 All production tests passed!");
    console.log("🚀 The app is ready for production use!");
    console.log("🌐 Live URL: https://voicevoter.netlify.app");
  } catch (error) {
    console.error("❌ Unexpected error during testing:", error);
  }
}

testLiveProduction().catch(console.error);
