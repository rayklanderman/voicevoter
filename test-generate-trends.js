// Manual test to generate trending topics
import { generateTrendingTopics } from "./src/lib/trendingSystem.js";

async function testGenerateTrending() {
  console.log("🚀 Testing trending topic generation...\n");

  try {
    const topics = await generateTrendingTopics();
    console.log(`✅ Generated ${topics.length} trending topics:`);

    topics.forEach((topic, index) => {
      console.log(
        `\n${index + 1}. [${topic.source.toUpperCase()}] ${topic.question_text}`
      );
      console.log(`   📝 Summary: ${topic.summary}`);
      console.log(`   📊 Score: ${topic.trending_score}`);
      console.log(`   🏷️  Category: ${topic.category}`);
      console.log(`   🔍 Keywords: ${topic.keywords?.join(", ")}`);
    });
  } catch (error) {
    console.error("❌ Error generating trending topics:", error);
  }
}

testGenerateTrending();
