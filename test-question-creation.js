// Test if trending system creates proper question records
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

async function checkQuestionCreation() {
  console.log(
    "🔍 Checking if trending system creates proper question records...\n"
  );

  try {
    // Get trending topics
    console.log("📊 Checking trending topics:");
    const { data: trendingTopics, error: trendsError } = await supabase
      .from("trending_topics")
      .select("*")
      .eq("is_active", true)
      .eq("is_safe", true)
      .limit(5);

    if (trendsError) {
      console.error("❌ Error fetching trending topics:", trendsError);
      return;
    }

    console.log(`✅ Found ${trendingTopics?.length || 0} trending topics`);

    for (const topic of trendingTopics || []) {
      console.log(`\n📝 Topic: ${topic.question_text}`);
      console.log(`   ID: ${topic.id}`);

      // Check if there's a corresponding question record
      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .select("*")
        .eq("id", topic.id);

      if (questionError) {
        console.error("   ❌ Error checking question:", questionError);
      } else if (questionData && questionData.length > 0) {
        console.log("   ✅ Found corresponding question record");
        console.log(`   📝 Question text: ${questionData[0].text}`);
      } else {
        console.log("   ❌ No corresponding question record found");

        // Try to find by text
        const { data: questionByText, error: textError } = await supabase
          .from("questions")
          .select("*")
          .eq("text", topic.question_text);

        if (textError) {
          console.error("   ❌ Error checking by text:", textError);
        } else if (questionByText && questionByText.length > 0) {
          console.log("   ✅ Found question record by text");
          console.log(`   📝 Question ID: ${questionByText[0].id}`);
        } else {
          console.log("   ❌ No question record found by text either");
        }
      }
    }

    // Check all questions with source 'trending'
    console.log("\n🔗 All questions with source 'trending':");
    const { data: trendingQuestions, error: tqError } = await supabase
      .from("questions")
      .select("*")
      .eq("source", "trending")
      .limit(10);

    if (tqError) {
      console.error("❌ Error fetching trending questions:", tqError);
    } else {
      console.log(
        `✅ Found ${
          trendingQuestions?.length || 0
        } trending questions in questions table`
      );
      trendingQuestions?.forEach((q, i) => {
        console.log(`${i + 1}. ${q.text} (ID: ${q.id})`);
      });
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

checkQuestionCreation();
