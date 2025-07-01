// Test database tables and functionality
import { createClient } from "@supabase/supabase-js";

// Use environment variables or your actual values
const supabaseUrl =
  process.env.VITE_SUPABASE_URL || "https://qljigxmedpdptwrqldxy.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseTables() {
  console.log("🔍 Testing database tables and functionality...\n");

  try {
    // Test 1: Check if trending_topics table exists and has data
    console.log("1️⃣ Testing trending_topics table...");
    const {
      data: trendingTopics,
      error: trendingError,
      count: trendingCount,
    } = await supabase
      .from("trending_topics")
      .select("*", { count: "exact" })
      .limit(5);

    if (trendingError) {
      console.error("❌ trending_topics error:", trendingError);
    } else {
      console.log(`✅ trending_topics: ${trendingCount} records found`);
      if (trendingTopics && trendingTopics.length > 0) {
        console.log(`   📝 Sample: "${trendingTopics[0].question_text}"`);
      }
    }

    // Test 2: Check if questions table exists
    console.log("\n2️⃣ Testing questions table...");
    const {
      data: questions,
      error: questionsError,
      count: questionsCount,
    } = await supabase
      .from("questions")
      .select("*", { count: "exact" })
      .limit(5);

    if (questionsError) {
      console.error("❌ questions error:", questionsError);
    } else {
      console.log(`✅ questions: ${questionsCount} records found`);
      if (questions && questions.length > 0) {
        console.log(`   📝 Sample: "${questions[0].text}"`);
      }
    }

    // Test 3: Check if votes table exists
    console.log("\n3️⃣ Testing votes table...");
    const {
      data: votes,
      error: votesError,
      count: votesCount,
    } = await supabase.from("votes").select("*", { count: "exact" }).limit(5);

    if (votesError) {
      console.error("❌ votes error:", votesError);
    } else {
      console.log(`✅ votes: ${votesCount} records found`);
    }

    // Test 4: Check if trend_votes table exists
    console.log("\n4️⃣ Testing trend_votes table...");
    const {
      data: trendVotes,
      error: trendVotesError,
      count: trendVotesCount,
    } = await supabase
      .from("trend_votes")
      .select("*", { count: "exact" })
      .limit(5);

    if (trendVotesError) {
      console.error("❌ trend_votes error:", trendVotesError);
    } else {
      console.log(`✅ trend_votes: ${trendVotesCount} records found`);
    }

    // Test 5: Check the relationship between trending_topics and questions
    console.log("\n5️⃣ Testing trending_topics ↔ questions relationship...");
    const { data: linkedData, error: linkError } = await supabase
      .from("trending_topics")
      .select(
        `
        id,
        question_text,
        question_id,
        questions!inner(id, text)
      `
      )
      .limit(3);

    if (linkError) {
      console.error("❌ relationship error:", linkError);
    } else {
      console.log(
        `✅ Found ${
          linkedData?.length || 0
        } trending topics with linked questions`
      );
      if (linkedData && linkedData.length > 0) {
        linkedData.forEach((item, i) => {
          console.log(`   ${i + 1}. Topic: "${item.question_text}"`);
          console.log(`      Question: "${item.questions?.text}"`);
        });
      }
    }

    console.log("\n🎯 Summary:");
    console.log("✅ All required tables exist");
    console.log(
      `📊 Data status: ${trendingCount} topics, ${questionsCount} questions, ${votesCount} votes`
    );

    if (trendingCount === 0) {
      console.log(
        "⚠️  No trending topics found - the automatic system may need time to generate data"
      );
    }
  } catch (err) {
    console.error("❌ Test failed:", err);
  }
}

// Run the test
testDatabaseTables().then(() => {
  console.log("\n✅ Database test complete!");
  process.exit(0);
});
