// API Configuration Test File
// Run this to verify all API keys are working correctly

// Test Supabase connection
async function testSupabase() {
  console.log("🔍 Testing Supabase connection...");
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.log("Supabase URL:", supabaseUrl);
    console.log("Supabase Key present:", !!supabaseKey);

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      console.log("✅ Supabase connection successful");
      return true;
    } else {
      console.error(
        "❌ Supabase connection failed:",
        response.status,
        response.statusText
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Supabase connection error:", error);
    return false;
  }
}

// Test ElevenLabs API
async function testElevenLabs() {
  console.log("🎙️ Testing ElevenLabs API...");
  try {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

    if (!apiKey || apiKey === "your_elevenlabs_api_key") {
      console.log("⚠️ ElevenLabs API key not configured");
      return false;
    }

    console.log("ElevenLabs Key present:", !!apiKey);
    console.log("Key format correct:", apiKey.startsWith("sk_"));

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(
        "✅ ElevenLabs API working, voices available:",
        data.voices?.length || 0
      );
      return true;
    } else {
      console.error(
        "❌ ElevenLabs API failed:",
        response.status,
        response.statusText
      );
      return false;
    }
  } catch (error) {
    console.error("❌ ElevenLabs API error:", error);
    return false;
  }
}

// Test Together AI
async function testTogetherAI() {
  console.log("🤖 Testing Together AI...");
  try {
    const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;

    if (!apiKey || apiKey === "your_together_api_key") {
      console.log("⚠️ Together AI API key not configured");
      return false;
    }

    console.log("Together AI Key present:", !!apiKey);
    console.log("Key format correct:", apiKey.startsWith("tgp_"));

    const response = await fetch("https://api.together.xyz/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(
        "✅ Together AI working, models available:",
        data.length || 0
      );
      return true;
    } else {
      console.error(
        "❌ Together AI failed:",
        response.status,
        response.statusText
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Together AI error:", error);
    return false;
  }
}

// Test NewsAPI
async function testNewsAPI() {
  console.log("📰 Testing NewsAPI...");
  try {
    const apiKey = import.meta.env.VITE_NEWS_API_KEY;

    if (!apiKey || apiKey === "your_news_api_key") {
      console.log("⚠️ NewsAPI key not configured");
      return false;
    }

    console.log("NewsAPI Key present:", !!apiKey);

    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=${apiKey}`
    );

    if (response.ok) {
      const data = await response.json();
      console.log(
        "✅ NewsAPI working, articles available:",
        data.articles?.length || 0
      );
      return true;
    } else {
      const errorData = await response.json();
      console.error(
        "❌ NewsAPI failed:",
        response.status,
        errorData.message || response.statusText
      );
      return false;
    }
  } catch (error) {
    console.error("❌ NewsAPI error:", error);
    return false;
  }
}

// Test Trends24.in access
async function testTrends24() {
  console.log("🐦 Testing Trends24.in access...");
  try {
    // Test with a simple fetch to see if we can access trends24.in
    const response = await fetch(
      "https://api.allorigins.win/get?url=" +
        encodeURIComponent("https://trends24.in/worldwide/"),
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.contents && data.contents.includes("trends24")) {
        console.log("✅ Trends24.in accessible via CORS proxy");
        return true;
      } else {
        console.log("⚠️ Trends24.in accessible but content may be blocked");
        return false;
      }
    } else {
      console.error(
        "❌ Trends24.in access failed:",
        response.status,
        response.statusText
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Trends24.in access error:", error);
    return false;
  }
}

// Main test function
export async function runAPITests() {
  console.log("🚀 Starting Voice Voter API Configuration Tests...\n");

  const results = {
    supabase: await testSupabase(),
    elevenLabs: await testElevenLabs(),
    togetherAI: await testTogetherAI(),
    newsAPI: await testNewsAPI(),
    trends24: await testTrends24(),
  };

  console.log("\n📊 API Test Results:");
  console.log("Supabase:", results.supabase ? "✅ Working" : "❌ Failed");
  console.log("ElevenLabs:", results.elevenLabs ? "✅ Working" : "❌ Failed");
  console.log("Together AI:", results.togetherAI ? "✅ Working" : "❌ Failed");
  console.log("NewsAPI:", results.newsAPI ? "✅ Working" : "❌ Failed");
  console.log("Trends24.in:", results.trends24 ? "✅ Working" : "❌ Failed");

  const workingAPIs = Object.values(results).filter(Boolean).length;
  const totalAPIs = Object.keys(results).length;

  console.log(`\n🎯 Summary: ${workingAPIs}/${totalAPIs} APIs working`);

  if (workingAPIs === totalAPIs) {
    console.log("🎉 All APIs are configured and working correctly!");
  } else if (workingAPIs >= 2) {
    console.log(
      "⚠️ Some APIs are working. The app will function with fallbacks."
    );
  } else {
    console.log(
      "❌ Critical: Most APIs are not working. Please check your configuration."
    );
  }

  return results;
}

// Auto-run tests in development
if (import.meta.env.DEV) {
  console.log("🔧 Development mode detected - running API tests...");
  runAPITests();
}
