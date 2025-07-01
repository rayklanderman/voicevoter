// Check trend_votes table schema
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

async function checkTrendVotesSchema() {
  console.log("🔍 Checking trend_votes table schema...\n");

  try {
    const { data: trendVotes, error } = await supabase
      .from("trend_votes")
      .select("*")
      .limit(1);

    if (error) {
      console.error("❌ Error:", error);
    } else if (trendVotes && trendVotes.length > 0) {
      console.log("Columns:", Object.keys(trendVotes[0]));
      console.log("Sample data:", trendVotes[0]);
    } else {
      console.log("✅ Table exists but no data found");
      // Try to get table info from information_schema if possible
    }
  } catch (error) {
    console.error("❌ Schema check failed:", error);
  }
}

checkTrendVotesSchema();
