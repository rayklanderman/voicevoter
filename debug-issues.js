import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugIssues() {
  console.log("🔍 Debugging 406 errors and missing topics...\n");

  try {
    // Test 1: Check if trending_topic_id column is accessible
    console.log("1. Testing trending_topic_id column access...");

    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("id, text, trending_topic_id")
      .limit(5);

    if (questionsError) {
      console.error("❌ Questions query failed:", questionsError);
    } else {
      console.log(
        `✅ Questions query works - found ${questions.length} questions`
      );
      questions.forEach((q, i) => {
        console.log(
          `   ${i + 1}. "${q.text.substring(0, 40)}..." - trending_topic_id: ${
            q.trending_topic_id || "NULL"
          }`
        );
      });
    }

    // Test 2: Test the exact failing query
    console.log("\n2. Testing the exact failing query...");

    const failingTopicId = "b350e707-407b-4d45-948f-0133d9697fb7";
    const { data: failingQuery, error: failingError } = await supabase
      .from("questions")
      .select("id")
      .eq("trending_topic_id", failingTopicId);

    if (failingError) {
      console.error("❌ Exact failing query failed:", failingError);
      console.log("   Error code:", failingError.code);
      console.log("   Error message:", failingError.message);
      console.log("   Error details:", failingError.details);
    } else {
      console.log(
        `✅ Exact failing query works - found ${failingQuery.length} questions`
      );
    }

    // Test 3: Check RLS policies on questions table
    console.log("\n3. Checking if the topic exists...");

    const { data: topicExists, error: topicError } = await supabase
      .from("trending_topics")
      .select("id, question_text, is_active, is_safe")
      .eq("id", failingTopicId)
      .single();

    if (topicError) {
      console.error("❌ Topic not found:", topicError);
    } else {
      console.log("✅ Topic exists:", topicExists);
    }

    // Test 4: Check newly created topics
    console.log("\n4. Checking newly created topics...");

    const { data: newTopics, error: newTopicsError } = await supabase
      .from("trending_topics")
      .select("*")
      .eq("is_active", true)
      .eq("is_safe", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (newTopicsError) {
      console.error("❌ New topics query failed:", newTopicsError);
    } else {
      console.log(`✅ Found ${newTopics.length} recent topics:`);
      newTopics.forEach((topic, i) => {
        console.log(
          `   ${i + 1}. "${topic.question_text.substring(
            0,
            50
          )}..." - Active: ${topic.is_active}, Safe: ${topic.is_safe}, Votes: ${
            topic.vote_count
          }`
        );
      });
    }

    // Test 5: Check the leaderboard view
    console.log("\n5. Testing leaderboard view...");

    const { data: leaderboard, error: leaderboardError } = await supabase
      .from("trending_leaderboard")
      .select("*")
      .limit(10);

    if (leaderboardError) {
      console.error("❌ Leaderboard query failed:", leaderboardError);
    } else {
      console.log(`✅ Leaderboard works - found ${leaderboard.length} topics:`);
      leaderboard.forEach((topic, i) => {
        console.log(
          `   ${i + 1}. "${topic.question_text.substring(0, 50)}..." - ${
            topic.total_votes
          } votes`
        );
      });
    }

    // Test 6: Check what the frontend should be loading
    console.log("\n6. Testing frontend trending query...");

    const { data: frontendTopics, error: frontendError } = await supabase
      .from("trending_topics")
      .select("*")
      .eq("is_active", true)
      .eq("is_safe", true)
      .order("vote_count", { ascending: false })
      .order("trending_score", { ascending: false })
      .limit(20);

    if (frontendError) {
      console.error("❌ Frontend query failed:", frontendError);
    } else {
      console.log(`✅ Frontend should show ${frontendTopics.length} topics:`);
      frontendTopics.slice(0, 5).forEach((topic, i) => {
        console.log(
          `   ${i + 1}. "${topic.question_text.substring(0, 50)}..." - ${
            topic.vote_count
          } votes`
        );
      });
    }

    // Test 7: Check database constraints and permissions
    console.log("\n7. Testing database permissions...");

    const { data: testInsert, error: insertError } = await supabase
      .from("questions")
      .select("id")
      .not("trending_topic_id", "is", null)
      .limit(1);

    if (insertError) {
      console.error("❌ Database permission test failed:", insertError);
    } else {
      console.log("✅ Database permissions working");
    }

    console.log("\n🎯 Diagnosis complete!");
  } catch (error) {
    console.error("❌ Unexpected error during debugging:", error);
  }
}

debugIssues().catch(console.error);
