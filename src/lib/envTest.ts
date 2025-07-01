// Quick Environment Variables Test
// This file can be imported in the browser console to test API configurations

export const testEnvironmentVariables = () => {
  console.log("🔍 Voice Voter Environment Variables Test");
  console.log("==========================================");

  const envVars = {
    "Supabase URL": import.meta.env.VITE_SUPABASE_URL,
    "Supabase Key": import.meta.env.VITE_SUPABASE_ANON_KEY
      ? `${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...`
      : "Not set",
    "ElevenLabs Key": import.meta.env.VITE_ELEVENLABS_API_KEY
      ? `${import.meta.env.VITE_ELEVENLABS_API_KEY.substring(0, 20)}...`
      : "Not set",
    "Together AI Key": import.meta.env.VITE_TOGETHER_API_KEY
      ? `${import.meta.env.VITE_TOGETHER_API_KEY.substring(0, 20)}...`
      : "Not set",
    "NewsAPI Key": import.meta.env.VITE_NEWS_API_KEY
      ? `${import.meta.env.VITE_NEWS_API_KEY.substring(0, 10)}...`
      : "Not set",
  };

  let configuredCount = 0;

  console.log("\n📊 Configuration Status:");
  Object.entries(envVars).forEach(([name, value]) => {
    const isConfigured =
      value && value !== "Not set" && !value.includes("your_");
    console.log(`${isConfigured ? "✅" : "❌"} ${name}: ${value}`);
    if (isConfigured) configuredCount++;
  });

  console.log(`\n🎯 Summary: ${configuredCount}/5 APIs configured`);

  if (configuredCount === 5) {
    console.log(
      "🎉 All APIs are configured! Voice Voter is ready with full features."
    );
  } else if (configuredCount >= 3) {
    console.log("⚠️ Most APIs configured. Some features will use fallbacks.");
  } else {
    console.log(
      "❌ Limited configuration. App will work with basic features only."
    );
  }

  return { configuredCount, total: 5, envVars };
};

// Auto-run in development
if (typeof window !== "undefined" && import.meta.env.DEV) {
  testEnvironmentVariables();
}

export default testEnvironmentVariables;
