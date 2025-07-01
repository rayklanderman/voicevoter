// Test Google Trends RSS and alternative sources
// import { JSDOM } from 'jsdom'; Test Google Trends RSS and alternative sources
const { JSDOM } = require("jsdom");

async function testGoogleTrends() {
  console.log("🔍 Testing Google Trends RSS...");

  try {
    // Try the RSS feed first
    const response = await fetch(
      "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US"
    );
    console.log("📡 Response status:", response.status);

    if (response.status === 404) {
      console.log("⚠️ Google Trends RSS not available, trying alternative...");
      return await testAlternativeTrends();
    }

    const xml = await response.text();
    console.log("📄 XML length:", xml.length);

    // Parse XML using JSDOM for Node.js
    const dom = new JSDOM(xml, { contentType: "text/xml" });
    const doc = dom.window.document;
    const items = doc.querySelectorAll("item");

    console.log("📊 Found", items.length, "trending items");

    if (items.length > 0) {
      console.log(
        "✅ First trend:",
        items[0].querySelector("title")?.textContent
      );
      return true;
    } else {
      console.log("⚠️ No trends found in RSS");
      return false;
    }
  } catch (error) {
    console.error("❌ Google Trends RSS test failed:", error.message);
    return false;
  }
}

async function testAlternativeTrends() {
  console.log("🔄 Testing alternative trend sources...");

  // Test Reddit API (free, works well)
  try {
    console.log("📡 Testing Reddit API...");
    const response = await fetch(
      "https://www.reddit.com/r/all/hot.json?limit=10"
    );

    if (response.ok) {
      const data = await response.json();
      const posts = data?.data?.children || [];

      if (posts.length > 0) {
        console.log("✅ Reddit API working!");
        console.log("📊 Found", posts.length, "hot posts");
        console.log(
          "🔥 Top post:",
          posts[0]?.data?.title?.substring(0, 60) + "..."
        );
        return true;
      }
    }
  } catch (error) {
    console.log("⚠️ Reddit API failed:", error.message);
  }

  // Test GitHub Trending (free, no API key)
  try {
    console.log("📡 Testing GitHub Trending API...");
    const response = await fetch(
      "https://api.github.com/search/repositories?q=created:>2024-06-01&sort=stars&order=desc&per_page=5"
    );

    if (response.ok) {
      const data = await response.json();
      const repos = data?.items || [];

      if (repos.length > 0) {
        console.log("✅ GitHub API working!");
        console.log("📊 Found", repos.length, "trending repos");
        console.log(
          "⭐ Top repo:",
          repos[0]?.name,
          "-",
          repos[0]?.description?.substring(0, 50) + "..."
        );
        return true;
      }
    }
  } catch (error) {
    console.log("⚠️ GitHub API failed:", error.message);
  }

  return false;
}

// Run the test
testGoogleTrends().then((success) => {
  if (success) {
    console.log("🎉 Trend source test PASSED");
  } else {
    console.log("❌ All trend sources failed");
  }
});
