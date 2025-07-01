// Test if AI-generated questions are in the database
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

async function checkDatabaseQuestions() {
  console.log("🔍 Checking if AI-generated questions are in the database...\n");

  try {
    // Check trending_topics table
    console.log("📊 Checking trending_topics table:");
    const { data: trendingTopics, error: trendingError } = await supabase
      .from("trending_topics")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (trendingError) {
      console.error("❌ Error fetching trending topics:", trendingError);
    } else {
      console.log(`✅ Found ${trendingTopics?.length || 0} trending topics`);
      trendingTopics?.forEach((topic, i) => {
        console.log(
          `${i + 1}. ${topic.topic_text} (Score: ${topic.trending_score})`
        );
      });
    }

    console.log("\n📝 Checking questions table:");
    // Check questions table
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (questionsError) {
      console.error("❌ Error fetching questions:", questionsError);
    } else {
      console.log(`✅ Found ${questions?.length || 0} questions`);
      questions?.forEach((question, i) => {
        console.log(
          `${i + 1}. ${question.question_text} (Active: ${question.is_active})`
        );
      });
    }

    console.log("\n🔗 Checking trending questions with voting capability:");
    // Check if trending topics have associated questions
    const { data: trendingQuestions, error: tqError } = await supabase
      .from("trending_topics")
      .select(
        `
        *,
        questions!inner(id, question_text, is_active)
      `
      )
      .eq("is_active", true)
      .eq("is_safe", true)
      .eq("questions.is_active", true)
      .order("vote_count", { ascending: false })
      .limit(10);

    if (tqError) {
      console.error("❌ Error fetching trending questions:", tqError);
    } else {
      console.log(
        `✅ Found ${
          trendingQuestions?.length || 0
        } trending topics with voting questions`
      );
      trendingQuestions?.forEach((tq, i) => {
        console.log(`${i + 1}. Topic: ${tq.topic_text}`);
        console.log(`   Question: ${tq.questions.question_text}`);
        console.log(`   Votes: ${tq.vote_count} | Score: ${tq.trending_score}`);
        console.log("");
      });
    }

    if (trendingQuestions?.length === 0) {
      console.log("⚠️  No trending topics with voting questions found!");
      console.log(
        "This means users can't see or vote on AI-generated questions."
      );
      console.log("\n🔧 The AI system needs to:");
      console.log("1. Generate trending topics");
      console.log("2. Convert them to voting questions");
      console.log("3. Store both in the database with proper linking");
    }
  } catch (error) {
    console.error("❌ Database check failed:", error);
  }
}

checkDatabaseQuestions();
