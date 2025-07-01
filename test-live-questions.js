// Test if AI-generated questions are working on the live site
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase credentials not found");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLiveQuestions() {
  console.log(
    "🔍 Testing if AI-generated questions are working on the live site...\n"
  );

  try {
    // Test the same query that the TrendingLeaderboard uses
    console.log("📊 Testing getTrendingQuestionsForVoting query:");
    const { data, error } = await supabase
      .from("trending_topics")
      .select("*")
      .eq("is_active", true)
      .eq("is_safe", true)
      .not("question_text", "is", null)
      .order("vote_count", { ascending: false })
      .order("trending_score", { ascending: false })
      .limit(10);

    if (error) {
      console.error("❌ Error fetching trending questions:", error);
      return;
    }

    console.log(`✅ Found ${data?.length || 0} trending questions for voting:`);

    if (data && data.length > 0) {
      data.forEach((topic, i) => {
        console.log(`${i + 1}. 📊 ${topic.question_text}`);
        console.log(
          `   📈 Score: ${topic.trending_score} | Votes: ${topic.vote_count}`
        );
        console.log(
          `   🏷️  Category: ${topic.category} | Source: ${topic.source}`
        );
        console.log(
          `   ✅ Active: ${topic.is_active} | Safe: ${topic.is_safe}`
        );
        console.log("");
      });

      console.log(
        "🎉 SUCCESS: AI-generated questions are ready for users to vote on!"
      );
      console.log(
        "Users can see these questions on https://voicevoter.netlify.app"
      );
    } else {
      console.log("⚠️  No AI-generated questions found.");
      console.log("This could mean:");
      console.log("1. The automatic trending system hasn't run yet");
      console.log("2. All questions were filtered out as unsafe");
      console.log("3. The AI system needs to be triggered manually");
    }

    // Test if there are any questions in the questions table created by the AI system
    console.log(
      "\n🔗 Checking if trending topics created corresponding question records:"
    );
    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select("*")
      .eq("source", "trending")
      .limit(5);

    if (questionsError) {
      console.error("❌ Error fetching questions:", questionsError);
    } else {
      console.log(
        `✅ Found ${
          questionsData?.length || 0
        } question records created by trending system`
      );
      questionsData?.forEach((q, i) => {
        console.log(`${i + 1}. ${q.text} (Active: ${q.is_active})`);
      });
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testLiveQuestions();
