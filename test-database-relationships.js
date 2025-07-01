// Test script to verify database relationships and schema
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase configuration in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabaseRelationships() {
  console.log("🔍 Checking database relationships and schema...\n");

  try {
    // Test 1: Check if questions table has trending_topic_id column
    console.log(
      "1. Checking if questions table has trending_topic_id column..."
    );
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("id, trending_topic_id")
      .limit(1);

    if (questionsError) {
      console.error(
        "❌ Error querying questions table:",
        questionsError.message
      );
    } else {
      console.log("✅ Questions table accessible");
      const hasField =
        questions.length > 0 &&
        questions[0].hasOwnProperty("trending_topic_id");
      console.log(
        `   - trending_topic_id column exists: ${hasField ? "✅" : "❌"}`
      );
    }

    // Test 2: Check trending_topics table
    console.log("\n2. Checking trending_topics table...");
    const { data: topics, error: topicsError } = await supabase
      .from("trending_topics")
      .select("id, question_text, vote_count")
      .limit(1);

    if (topicsError) {
      console.error(
        "❌ Error querying trending_topics table:",
        topicsError.message
      );
    } else {
      console.log("✅ Trending topics table accessible");
      console.log(`   - Found ${topics.length} sample records`);
    }

    // Test 3: Check votes table with constraints
    console.log("\n3. Checking votes table constraints...");
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("id, question_id, user_id, session_id, is_anonymous")
      .limit(1);

    if (votesError) {
      console.error("❌ Error querying votes table:", votesError.message);
    } else {
      console.log("✅ Votes table accessible");
      console.log(`   - Found ${votes.length} sample records`);
    }

    // Test 4: Check trend_votes table
    console.log("\n4. Checking trend_votes table...");
    const { data: trendVotes, error: trendVotesError } = await supabase
      .from("trend_votes")
      .select("id, trending_topic_id, user_id, session_id, is_anonymous")
      .limit(1);

    if (trendVotesError) {
      console.error(
        "❌ Error querying trend_votes table:",
        trendVotesError.message
      );
    } else {
      console.log("✅ Trend votes table accessible");
      console.log(`   - Found ${trendVotes.length} sample records`);
    }

    // Test 5: Try to create a test relationship
    console.log("\n5. Testing foreign key relationship...");

    // First create a test trending topic
    const { data: newTopic, error: createTopicError } = await supabase
      .from("trending_topics")
      .insert({
        source: "test",
        raw_topic: "Test Relationship Topic",
        question_text: "Testing database relationships?",
        vote_count: 0,
      })
      .select()
      .single();

    if (createTopicError) {
      console.error(
        "❌ Error creating test trending topic:",
        createTopicError.message
      );
    } else {
      console.log("✅ Test trending topic created:", newTopic.id);

      // Now try to create a question with the trending_topic_id
      const { data: newQuestion, error: createQuestionError } = await supabase
        .from("questions")
        .insert({
          text: "Test relationship question",
          trending_topic_id: newTopic.id,
        })
        .select()
        .single();

      if (createQuestionError) {
        console.error(
          "❌ Error creating question with trending_topic_id:",
          createQuestionError.message
        );
      } else {
        console.log("✅ Question created with trending_topic_id relationship");

        // Clean up test data
        await supabase.from("questions").delete().eq("id", newQuestion.id);
        await supabase.from("trending_topics").delete().eq("id", newTopic.id);
        console.log("🧹 Test data cleaned up");
      }
    }

    console.log("\n✅ Database relationship test completed!");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

// Run the test
testDatabaseRelationships().catch(console.error);
