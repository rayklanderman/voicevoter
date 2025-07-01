// Test the live trending system
import { createClient } from "@supabase/supabase-js";

// Your Supabase configuration (from .env)
const supabaseUrl = process.env.VITE_SUPABASE_URL || "your-supabase-url";
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY || "your-supabase-anon-key";

if (!supabaseUrl.startsWith("https://") || !supabaseKey.startsWith("eyJ")) {
  console.error(
    "❌ Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment"
  );
  console.log("You can find these in your Supabase project settings");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTrendingTopics() {
  console.log("🔍 Testing trending topics in database...\n");

  try {
    // Check if there are any trending topics in the database
    const {
      data: topics,
      error,
      count,
    } = await supabase
      .from("trending_topics")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("❌ Database error:", error);
      return;
    }

    console.log(`📊 Found ${count} active trending topics in database`);

    if (topics && topics.length > 0) {
      console.log("\n🎯 Recent trending topics:");
      topics.forEach((topic, index) => {
        console.log(
          `${index + 1}. [${topic.source.toUpperCase()}] ${topic.question_text}`
        );
        console.log(
          `   📅 Created: ${new Date(topic.created_at).toLocaleString()}`
        );
        console.log(
          `   📊 Score: ${topic.trending_score}, Votes: ${topic.vote_count}`
        );
        console.log(`   🏷️  Category: ${topic.category}`);
        console.log("");
      });
    } else {
      console.log("⚠️  No trending topics found in database!");
      console.log("   This could mean:");
      console.log("   1. The automatic system hasn't run yet");
      console.log("   2. API sources are not working");
      console.log("   3. Topics are being filtered out as unsafe");
    }

    // Check when the last topics were created
    const { data: lastTopic } = await supabase
      .from("trending_topics")
      .select("created_at, source")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastTopic) {
      const lastUpdate = new Date(lastTopic.created_at);
      const timeSince = Math.round(
        (Date.now() - lastUpdate.getTime()) / (1000 * 60)
      );
      console.log(
        `⏰ Last topic created: ${timeSince} minutes ago from ${lastTopic.source}`
      );
    }

    // Check sources distribution
    const { data: sourceStats } = await supabase
      .from("trending_topics")
      .select("source")
      .eq("is_active", true);

    if (sourceStats) {
      const sourceCounts = sourceStats.reduce((acc, curr) => {
        acc[curr.source] = (acc[curr.source] || 0) + 1;
        return acc;
      }, {});

      console.log("\n📈 Topics by source:");
      Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`   ${source}: ${count} topics`);
      });
    }
  } catch (err) {
    console.error("❌ Test failed:", err);
  }
}

// Run the test
testTrendingTopics().then(() => {
  console.log("\n✅ Trending topics test complete!");
  process.exit(0);
});
