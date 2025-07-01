// Quick test to generate some trending topics manually
console.log("🚀 Testing trending topic generation...");

// Import our trending system
import("./src/lib/trendingSystem.js")
  .then(async (module) => {
    const { generateTrendingTopics, getActiveTrendingTopics } = module;

    try {
      console.log("📊 Checking current topics...");
      const currentTopics = await getActiveTrendingTopics();
      console.log(`Current topics in DB: ${currentTopics.length}`);

      if (currentTopics.length > 0) {
        console.log("Recent topics:");
        currentTopics.slice(0, 3).forEach((topic, i) => {
          console.log(`${i + 1}. ${topic.question_text}`);
        });
      }

      console.log("\n🔄 Generating new topics...");
      const newTopics = await generateTrendingTopics();
      console.log(`✅ Generated ${newTopics.length} new topics!`);

      if (newTopics.length > 0) {
        console.log("New topics:");
        newTopics.slice(0, 3).forEach((topic, i) => {
          console.log(`${i + 1}. ${topic.question_text}`);
        });
      }
    } catch (error) {
      console.error("❌ Error:", error);
    }
  })
  .catch((err) => {
    console.error("❌ Import error:", err);
  });
