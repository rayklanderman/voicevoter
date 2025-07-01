import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLiveWebsiteErrors() {
  console.log("🔍 Testing the ACTUAL live website errors...\n");

  try {
    // Test 1: The exact 406 error you're seeing
    console.log("1. Testing the specific 406 error queries...");

    // Test the exact query that's failing
    const testTopicId = "b350e707-407b-4d45-948f-0133d9697fb7";

    const { data: test406, error: error406 } = await supabase
      .from("questions")
      .select("id")
      .eq("trending_topic_id", testTopicId);

    if (error406) {
      console.error("❌ 406 Error confirmed:", error406);
      console.log("   This is the REAL error causing the 406!");

      // Test if the topic exists
      const { data: topicExists, error: topicError } = await supabase
        .from("trending_topics")
        .select("id, question_text")
        .eq("id", testTopicId)
        .single();

      if (topicError) {
        console.error("❌ Topic does not exist:", topicError);
      } else {
        console.log("✅ Topic exists:", topicExists.question_text);

        // Check if there's a question for this topic
        const { data: questionExists, error: questionError } = await supabase
          .from("questions")
          .select("*")
          .eq("trending_topic_id", testTopicId);

        if (questionError) {
          console.error("❌ Question query failed:", questionError);
        } else {
          console.log(
            `✅ Found ${questionExists?.length || 0} questions for this topic`
          );
        }
      }
    } else {
      console.log("✅ No 406 error in this test");
    }

    // Test 2: Check why new topics aren't showing
    console.log("\n2. Testing why new topics are not appearing...");

    const { data: allTopics, error: allTopicsError } = await supabase
      .from("trending_topics")
      .select("*")
      .eq("is_active", true)
      .eq("is_safe", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (allTopicsError) {
      console.error("❌ Failed to get topics:", allTopicsError);
    } else {
      console.log(`✅ Found ${allTopics.length} active topics in database`);
      console.log("📊 Latest topics:");
      allTopics.slice(0, 5).forEach((topic, i) => {
        console.log(
          `   ${i + 1}. "${topic.question_text.substring(
            0,
            50
          )}..." (Created: ${new Date(topic.created_at).toLocaleString()})`
        );
      });
    }

    // Test 3: Test the leaderboard view
    console.log("\n3. Testing leaderboard view that frontend uses...");

    const { data: leaderboardTest, error: leaderboardError } = await supabase
      .from("trending_leaderboard")
      .select("*")
      .limit(10);

    if (leaderboardError) {
      console.error("❌ Leaderboard view failed:", leaderboardError);
      console.log("   This could be why topics are not showing!");

      // Test fallback query
      const { data: fallback, error: fallbackError } = await supabase
        .from("trending_topics")
        .select("*")
        .eq("is_active", true)
        .eq("is_safe", true)
        .order("vote_count", { ascending: false })
        .limit(10);

      if (fallbackError) {
        console.error("❌ Fallback query also failed:", fallbackError);
      } else {
        console.log(`✅ Fallback query works - ${fallback.length} topics`);
      }
    } else {
      console.log(
        `✅ Leaderboard view works - ${leaderboardTest.length} topics`
      );
    }

    // Test 4: Test actual voting (simulate what happens when user clicks YES/NO)
    console.log("\n4. Testing actual voting process...");

    if (allTopics && allTopics.length > 0) {
      const testTopic = allTopics[0];
      const sessionId = `real-test-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      console.log(
        `   Testing vote on: "${testTopic.question_text.substring(0, 50)}..."`
      );

      // Simulate the exact voting process from the frontend
      const { data: voteResult, error: voteError } = await supabase
        .from("trend_votes")
        .insert({
          trending_topic_id: testTopic.id,
          session_id: sessionId,
          is_anonymous: true,
        })
        .select();

      if (voteError) {
        console.error("❌ Real voting failed:", voteError);
        console.log("   This is why YES/NO buttons are not working!");
      } else {
        console.log("✅ Real voting works");

        // Check if vote count updated
        const { data: updatedTopic, error: updateError } = await supabase
          .from("trending_topics")
          .select("vote_count")
          .eq("id", testTopic.id)
          .single();

        if (!updateError && updatedTopic) {
          console.log(
            `✅ Vote count updated: ${testTopic.vote_count} → ${updatedTopic.vote_count}`
          );
        }

        // Clean up
        await supabase.from("trend_votes").delete().eq("session_id", sessionId);
      }
    }

    // Test 5: Check database permissions/RLS
    console.log("\n5. Testing database permissions (RLS)...");

    // Test as anonymous user (most users)
    const { data: anonTest, error: anonError } = await supabase
      .from("trending_topics")
      .select("*")
      .limit(1);

    if (anonError) {
      console.error("❌ Anonymous access failed:", anonError);
      console.log("   This could be an RLS policy issue!");
    } else {
      console.log("✅ Anonymous access works");
    }

    // Test insert permissions
    const { data: insertTest, error: insertError } = await supabase
      .from("trend_votes")
      .insert({
        trending_topic_id: allTopics[0]?.id,
        session_id: `permission-test-${Date.now()}`,
        is_anonymous: true,
      })
      .select();

    if (insertError) {
      console.error("❌ Insert permission failed:", insertError);
      console.log("   This is why voting might not work!");
    } else {
      console.log("✅ Insert permission works");
      // Clean up
      await supabase.from("trend_votes").delete().eq("id", insertTest[0].id);
    }

    console.log("\n🎯 REAL ISSUES FOUND:");
    console.log("=====================================");
  } catch (error) {
    console.error("❌ Critical error during real testing:", error);
  }
}

testLiveWebsiteErrors().catch(console.error);
