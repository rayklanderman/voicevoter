// Check database schema to understand the structure
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

async function checkSchema() {
  console.log("🔍 Checking database schema...\n");

  try {
    // Check trending_topics table structure
    console.log("📊 Trending Topics Table:");
    const { data: trendingTopics, error: trendingError } = await supabase
      .from("trending_topics")
      .select("*")
      .limit(1);

    if (trendingError) {
      console.error("❌ Error:", trendingError);
    } else if (trendingTopics && trendingTopics.length > 0) {
      console.log("Columns:", Object.keys(trendingTopics[0]));
      console.log("Sample data:", trendingTopics[0]);
    }

    console.log("\n📝 Questions Table:");
    // Check questions table structure
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("*")
      .limit(1);

    if (questionsError) {
      console.error("❌ Error:", questionsError);
    } else if (questions && questions.length > 0) {
      console.log("Columns:", Object.keys(questions[0]));
      console.log("Sample data:", questions[0]);
    }

    console.log("\n🗳️ Votes Table:");
    // Check votes table structure
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("*")
      .limit(1);

    if (votesError) {
      console.error("❌ Error:", votesError);
    } else if (votes && votes.length > 0) {
      console.log("Columns:", Object.keys(votes[0]));
      console.log("Sample data:", votes[0]);
    }
  } catch (error) {
    console.error("❌ Schema check failed:", error);
  }
}

checkSchema();
