// Test the specific queries that are failing in production
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFailingQueries() {
  console.log("🔍 Testing specific failing queries from production...\n");

  try {
    // Test 1: The exact query that's failing with 400 error
    console.log("1. Testing trending topics with questions join...");

    const { data: trendingWithQuestions, error: trendingError } = await supabase
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
      .order("trending_score", { ascending: false })
      .limit(20);

    if (trendingError) {
      console.error("❌ Trending topics query failed:", trendingError);

      // Try a simpler version without the foreign key reference
      console.log("   Trying simplified query...");

      const { data: simpleTrending, error: simpleError } = await supabase
        .from("trending_topics")
        .select("*")
        .eq("is_active", true)
        .eq("is_safe", true)
        .limit(5);

      if (simpleError) {
        console.error(
          "❌ Even simple trending topics query failed:",
          simpleError
        );
      } else {
        console.log(
          "✅ Simple trending topics query works, found:",
          simpleTrending.length
        );

        // Try to get questions for these topics manually
        if (simpleTrending.length > 0) {
          const topicIds = simpleTrending.map((t) => t.id);
          const { data: questions, error: questionsError } = await supabase
            .from("questions")
            .select("*")
            .in("trending_topic_id", topicIds);

          if (questionsError) {
            console.error("❌ Questions lookup failed:", questionsError);
          } else {
            console.log(
              "✅ Manual questions lookup works, found:",
              questions.length
            );
          }
        }
      }
    } else {
      console.log("✅ Trending topics with questions join works!");
      console.log(
        `   Found ${trendingWithQuestions.length} topics with questions`
      );
    }

    // Test 2: Test question insertion that's getting 409 conflicts
    console.log("\n2. Testing question insertion...");

    const { data: newQuestion, error: questionError } = await supabase
      .from("questions")
      .insert({
        text: "Test question for 409 debugging",
        moderation_status: "approved",
      })
      .select()
      .single();

    if (questionError) {
      console.error("❌ Question insertion failed:", questionError);
      console.log("   Error details:", JSON.stringify(questionError, null, 2));
    } else {
      console.log("✅ Question insertion works");

      // Clean up
      await supabase.from("questions").delete().eq("id", newQuestion.id);
      console.log("🧹 Test question cleaned up");
    }

    // Test 3: Test vote insertion that's getting foreign key errors
    console.log("\n3. Testing vote insertion...");

    // First get a real question
    const { data: realQuestions } = await supabase
      .from("questions")
      .select("id")
      .limit(1);

    if (realQuestions && realQuestions.length > 0) {
      const questionId = realQuestions[0].id;

      const { data: newVote, error: voteError } = await supabase
        .from("votes")
        .insert({
          question_id: questionId,
          choice: "yes",
          session_id: `test-session-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          is_anonymous: true,
        })
        .select()
        .single();

      if (voteError) {
        console.error("❌ Vote insertion failed:", voteError);
        console.log("   Error details:", JSON.stringify(voteError, null, 2));
      } else {
        console.log("✅ Vote insertion works");

        // Clean up
        await supabase.from("votes").delete().eq("id", newVote.id);
        console.log("🧹 Test vote cleaned up");
      }
    } else {
      console.log("❌ No questions available for vote testing");
    }

    console.log("\n✅ Production query testing completed!");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

testFailingQueries().catch(console.error);
