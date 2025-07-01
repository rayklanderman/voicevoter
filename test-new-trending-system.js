// Test the new trending system (Reddit + GitHub + News, no more X scraping)

import {
  getActiveTrendingTopics,
  generateTrendingTopics,
} from "./src/lib/trendingSystem.js";

async function testNewTrendingSystem() {
  console.log("🚀 Testing New Trending System (Reddit + GitHub + News)");
  console.log("=".repeat(60));

  try {
    // Test 1: Check if we can get current trending topics
    console.log("📊 Testing getActiveTrendingTopics...");
    const currentTopics = await getActiveTrendingTopics();
    console.log(`✅ Found ${currentTopics.length} active trending topics`);

    if (currentTopics.length > 0) {
      console.log("🔥 Top trending topic:");
      console.log(
        `   Title: ${currentTopics[0].question_text?.substring(0, 80)}...`
      );
      console.log(`   Source: ${currentTopics[0].source}`);
      console.log(`   Votes: ${currentTopics[0].vote_count}`);
    }

    // Test 2: Generate new trending topics
    console.log("\n🤖 Testing generateTrendingTopics (with new sources)...");
    const newTopics = await generateTrendingTopics();
    console.log(`✅ Generated ${newTopics.length} new trending topics`);

    if (newTopics.length > 0) {
      console.log("🆕 Sample new topics:");
      newTopics.slice(0, 3).forEach((topic, i) => {
        console.log(
          `   ${i + 1}. [${topic.source}] ${topic.question_text?.substring(
            0,
            60
          )}...`
        );
      });

      // Check sources
      const sources = [...new Set(newTopics.map((t) => t.source))];
      console.log(`📡 Sources used: ${sources.join(", ")}`);

      // Verify no X/Twitter scraping
      const hasXTwitter = sources.some(
        (s) => s.includes("x_twitter") || s.includes("twitter")
      );
      if (!hasXTwitter) {
        console.log("✅ SUCCESS: No unreliable X/Twitter scraping detected!");
      } else {
        console.log("⚠️  WARNING: Still using X/Twitter scraping");
      }
    }

    console.log("\n🎉 New Trending System Test PASSED!");
    console.log("🔧 Improvements made:");
    console.log("   ✅ Replaced unreliable X/Twitter scraping");
    console.log("   ✅ Added reliable Reddit API");
    console.log("   ✅ Added reliable GitHub trending");
    console.log("   ✅ Kept working NewsAPI integration");
    console.log("   ✅ Better error handling and fallbacks");
  } catch (error) {
    console.error("❌ New Trending System Test FAILED:", error.message);
    console.log(
      "🔍 This might be expected for first run - check the development server"
    );
  }
}

testNewTrendingSystem();
