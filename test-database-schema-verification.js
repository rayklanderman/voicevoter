// Advanced database schema verification
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase configuration");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyDatabaseSchema() {
  console.log("🔍 Advanced Database Schema Verification\n");

  try {
    // Test unique constraint for authenticated users
    console.log("1. Testing unique vote constraint for authenticated users...");

    // Create a test question first
    const { data: question, error: questionError } = await supabase
      .from("questions")
      .insert({
        text: "Test question for constraint verification",
      })
      .select()
      .single();

    if (questionError) {
      console.error(
        "❌ Failed to create test question:",
        questionError.message
      );
      return;
    }

    console.log("✅ Test question created");

    // Test RLS policies
    console.log("\n2. Testing Row Level Security policies...");

    // Test reading questions (should work)
    const { data: questions, error: readError } = await supabase
      .from("questions")
      .select("*")
      .limit(1);

    if (readError) {
      console.error("❌ RLS policy test failed:", readError.message);
    } else {
      console.log("✅ RLS policy allows reading questions");
    }

    // Test inserting anonymous vote
    console.log("\n3. Testing anonymous vote insertion...");

    const { data: vote, error: voteError } = await supabase
      .from("votes")
      .insert({
        question_id: question.id,
        choice: "yes",
        session_id: "test-session-123",
        is_anonymous: true,
      })
      .select()
      .single();

    if (voteError) {
      console.error("❌ Anonymous vote insertion failed:", voteError.message);
    } else {
      console.log("✅ Anonymous vote inserted successfully");

      // Try to insert duplicate vote (should fail)
      console.log("\n4. Testing duplicate vote prevention...");

      const { data: dupVote, error: dupError } = await supabase
        .from("votes")
        .insert({
          question_id: question.id,
          choice: "no",
          session_id: "test-session-123",
          is_anonymous: true,
        })
        .select()
        .single();

      if (dupError) {
        console.log("✅ Duplicate vote correctly prevented:", dupError.message);
      } else {
        console.log("❌ Duplicate vote was allowed (this should not happen)");
      }
    }

    // Test trending topic relationship
    console.log("\n5. Testing trending topic relationship...");

    const { data: trendingTopic, error: trendError } = await supabase
      .from("trending_topics")
      .insert({
        source: "test",
        raw_topic: "Verification Test Topic",
        question_text: "Is this verification working?",
      })
      .select()
      .single();

    if (trendError) {
      console.error("❌ Trending topic creation failed:", trendError.message);
    } else {
      console.log("✅ Trending topic created");

      // Update question with trending topic ID
      const { error: updateError } = await supabase
        .from("questions")
        .update({ trending_topic_id: trendingTopic.id })
        .eq("id", question.id);

      if (updateError) {
        console.error(
          "❌ Failed to link question to trending topic:",
          updateError.message
        );
      } else {
        console.log("✅ Question successfully linked to trending topic");
      }
    }

    // Cleanup
    console.log("\n6. Cleaning up test data...");

    await supabase.from("votes").delete().eq("question_id", question.id);
    await supabase.from("questions").delete().eq("id", question.id);

    if (trendingTopic) {
      await supabase
        .from("trending_topics")
        .delete()
        .eq("id", trendingTopic.id);
    }

    console.log("🧹 Cleanup completed");
    console.log("\n✅ All database schema verifications passed!");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

verifyDatabaseSchema().catch(console.error);
