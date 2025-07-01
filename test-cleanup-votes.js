import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupTestData() {
  console.log("🧹 Cleaning up test data...");

  try {
    // Clean up any test votes (those with session_id starting with 'test-')
    const { data: testVotes, error: selectError } = await supabase
      .from("votes")
      .select("id, session_id, question_id")
      .like("session_id", "test-%");

    if (selectError) {
      console.error("Error finding test votes:", selectError);
    } else {
      console.log(`Found ${testVotes?.length || 0} test votes to clean up`);

      if (testVotes && testVotes.length > 0) {
        const { error: deleteError } = await supabase
          .from("votes")
          .delete()
          .like("session_id", "test-%");

        if (deleteError) {
          console.error("Error deleting test votes:", deleteError);
        } else {
          console.log("✅ Test votes cleaned up successfully");
        }
      }
    }

    // Clean up any test questions (those with text starting with 'Test question')
    const { data: testQuestions, error: selectQError } = await supabase
      .from("questions")
      .select("id, text")
      .like("text", "Test question%");

    if (selectQError) {
      console.error("Error finding test questions:", selectQError);
    } else {
      console.log(
        `Found ${testQuestions?.length || 0} test questions to clean up`
      );

      if (testQuestions && testQuestions.length > 0) {
        const { error: deleteQError } = await supabase
          .from("questions")
          .delete()
          .like("text", "Test question%");

        if (deleteQError) {
          console.error("Error deleting test questions:", deleteQError);
        } else {
          console.log("✅ Test questions cleaned up successfully");
        }
      }
    }

    console.log("✅ Cleanup completed!");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  }
}

cleanupTestData();
