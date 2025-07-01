// Test AI logic for converting trends to voting questions
import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const TOGETHER_API_KEY = process.env.VITE_TOGETHER_API_KEY;

async function testAILogic() {
  console.log(
    "🧠 Testing AI logic for creating voting questions from trends...\n"
  );

  if (!TOGETHER_API_KEY) {
    console.log("❌ Together AI API key not found. Testing fallback logic...");
    testFallbackLogic();
    return;
  }

  const testTopics = [
    "Artificial Intelligence replacing jobs in 2025",
    "Climate change solutions breakthrough announced",
    "New social media platform gaining millions of users",
    "Cryptocurrency market volatility continues",
    "Remote work policies being reversed by major companies",
  ];

  console.log("📝 Test topics:");
  testTopics.forEach((topic, i) => console.log(`${i + 1}. ${topic}`));
  console.log("\n🤖 Sending to Together AI (Llama 3.1 405B)...\n");

  const prompt = `You are an expert at converting trending social media topics into engaging yes/no poll questions for a global voting platform.

TRENDING TOPICS:
${testTopics.map((topic, i) => `${i + 1}. ${topic}`).join("\n")}

TASK: Convert each topic into a compelling yes/no poll question that:
- Is globally relevant and engaging
- Generates healthy debate
- Is answerable with YES or NO
- Avoids harmful, offensive, or overly divisive content
- Focuses on the core issue or trend

CATEGORIES: Technology, Politics, Environment, Health, Entertainment, Sports, Economy, Science, Social Issues, Lifestyle, News, Culture

OUTPUT FORMAT (JSON only, no other text):
[
  {
    "raw_topic": "Original topic text",
    "question_text": "Should [clear yes/no question]?",
    "summary": "Brief 1-sentence summary",
    "context": "Why this is trending and globally relevant (2-3 sentences)",
    "category": "Most appropriate category",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
    "trending_score": 75,
    "is_safe": true
  }
]

Generate compelling questions that people worldwide would want to vote on!`;

  try {
    const response = await fetch(
      "https://api.together.xyz/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 3000,
          temperature: 0.7,
          top_p: 0.9,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Together AI API error: ${response.status} - ${response.statusText}`
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from Together AI");
    }

    console.log("✅ AI Response received. Processing...\n");

    try {
      const processedTopics = JSON.parse(content);

      console.log(`🎯 Generated ${processedTopics.length} voting questions:\n`);

      processedTopics.forEach((topic, index) => {
        console.log(`${index + 1}. 📊 ${topic.question_text}`);
        console.log(`   📝 Summary: ${topic.summary}`);
        console.log(`   🏷️  Category: ${topic.category}`);
        console.log(`   📈 Score: ${topic.trending_score}`);
        console.log(`   🔍 Keywords: ${topic.keywords?.join(", ")}`);
        console.log(`   🛡️  Safe: ${topic.is_safe ? "✅" : "❌"}`);
        console.log(`   📰 Context: ${topic.context}`);
        console.log("");
      });

      const safeTopics = processedTopics.filter((t) => t.is_safe);
      console.log(
        `✅ AI Logic Working! Generated ${safeTopics.length} safe voting questions out of ${processedTopics.length} total.`
      );
    } catch (parseError) {
      console.error("❌ Error parsing AI response:", parseError);
      console.log("Raw response:", content);
    }
  } catch (error) {
    console.error("❌ AI Logic Error:", error);
    console.log("\n🔄 Testing fallback logic instead...\n");
    testFallbackLogic();
  }
}

function testFallbackLogic() {
  console.log("🛡️ Testing fallback question generation logic...\n");

  const testTopics = [
    "Artificial Intelligence replacing jobs in 2025",
    "Should remote work become permanent",
    "Climate change breakthrough discovery",
    "New TikTok trend goes viral worldwide",
    "Cryptocurrency ban proposed by governments",
  ];

  testTopics.forEach((topic, index) => {
    const question = generateQuestionFromTopic(topic);
    const category = categorizeTopicByKeywords(topic);
    const keywords = extractKeywords(topic);

    console.log(`${index + 1}. 📊 ${question}`);
    console.log(`   🏷️  Category: ${category}`);
    console.log(`   🔍 Keywords: ${keywords.join(", ")}`);
    console.log("");
  });

  console.log("✅ Fallback logic working! Questions generated successfully.");
}

// Fallback functions (simplified versions)
function generateQuestionFromTopic(topic) {
  const lowerTopic = topic.toLowerCase();

  if (
    lowerTopic.includes("should") ||
    lowerTopic.includes("must") ||
    lowerTopic.includes("need to")
  ) {
    return topic.endsWith("?") ? topic : `${topic}?`;
  }

  if (lowerTopic.includes("ban") || lowerTopic.includes("prohibit")) {
    return `Should this be implemented: ${topic}?`;
  }

  if (lowerTopic.includes("breakthrough") || lowerTopic.includes("discovery")) {
    return `Should this innovation be widely adopted: ${topic}?`;
  }

  if (lowerTopic.includes("trend") || lowerTopic.includes("viral")) {
    return `Is this trend beneficial for society: ${topic}?`;
  }

  const starters = [
    "Should society embrace",
    "Is it time to support",
    "Should we prioritize",
    "Is this the future we want",
    "Should this become mainstream",
  ];

  const randomStarter = starters[Math.floor(Math.random() * starters.length)];
  return `${randomStarter}: ${topic}?`;
}

function categorizeTopicByKeywords(topic) {
  const lowerTopic = topic.toLowerCase();

  if (
    lowerTopic.match(
      /\b(ai|artificial intelligence|tech|digital|crypto|blockchain)\b/
    )
  ) {
    return "Technology";
  }
  if (lowerTopic.match(/\b(climate|environment|green|sustainability)\b/)) {
    return "Environment";
  }
  if (lowerTopic.match(/\b(economy|finance|market|job|work)\b/)) {
    return "Economy";
  }
  if (lowerTopic.match(/\b(social|trend|viral|tiktok)\b/)) {
    return "Social Issues";
  }

  return "General";
}

function extractKeywords(topic) {
  return topic
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 4);
}

testAILogic();
