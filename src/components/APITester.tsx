import React, { useState } from "react";
import { Shield, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

interface APITestResult {
  name: string;
  status: "pending" | "success" | "error";
  message: string;
  details?: string;
}

export default function APITester() {
  const [results, setResults] = useState<APITestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const updateResult = (
    name: string,
    status: "success" | "error",
    message: string,
    details?: string
  ) => {
    setResults((prev) =>
      prev.map((r) =>
        r.name === name ? { ...r, status, message, details } : r
      )
    );
  };

  const initializeResults = () => {
    setResults([
      { name: "Supabase", status: "pending", message: "Testing connection..." },
      {
        name: "ElevenLabs",
        status: "pending",
        message: "Testing voice API...",
      },
      {
        name: "Together AI",
        status: "pending",
        message: "Testing AI models...",
      },
      { name: "NewsAPI", status: "pending", message: "Testing news feed..." },
      {
        name: "Trends24",
        status: "pending",
        message: "Testing X/Twitter trends...",
      },
    ]);
  };

  const testSupabase = async () => {
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!url || !key) {
        updateResult(
          "Supabase",
          "error",
          "Environment variables not found",
          "Check .env file"
        );
        return;
      }

      const response = await fetch(`${url}/rest/v1/`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      });

      if (response.ok) {
        updateResult(
          "Supabase",
          "success",
          "Connected successfully",
          `URL: ${url.substring(0, 30)}...`
        );
      } else {
        updateResult(
          "Supabase",
          "error",
          `HTTP ${response.status}`,
          response.statusText
        );
      }
    } catch (error) {
      updateResult(
        "Supabase",
        "error",
        "Connection failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  const testElevenLabs = async () => {
    try {
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

      if (!apiKey || apiKey === "your_elevenlabs_api_key") {
        updateResult(
          "ElevenLabs",
          "error",
          "API key not configured",
          "Set VITE_ELEVENLABS_API_KEY in .env"
        );
        return;
      }

      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: {
          "xi-api-key": apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        updateResult(
          "ElevenLabs",
          "success",
          "API working",
          `${data.voices?.length || 0} voices available`
        );
      } else {
        updateResult(
          "ElevenLabs",
          "error",
          `HTTP ${response.status}`,
          response.statusText
        );
      }
    } catch (error) {
      updateResult(
        "ElevenLabs",
        "error",
        "Connection failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  const testTogetherAI = async () => {
    try {
      const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;

      if (!apiKey || apiKey === "your_together_api_key") {
        updateResult(
          "Together AI",
          "error",
          "API key not configured",
          "Set VITE_TOGETHER_API_KEY in .env"
        );
        return;
      }

      const response = await fetch("https://api.together.xyz/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        updateResult(
          "Together AI",
          "success",
          "API working",
          `${data.length || 0} models available`
        );
      } else {
        updateResult(
          "Together AI",
          "error",
          `HTTP ${response.status}`,
          response.statusText
        );
      }
    } catch (error) {
      updateResult(
        "Together AI",
        "error",
        "Connection failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  const testNewsAPI = async () => {
    try {
      const apiKey = import.meta.env.VITE_NEWS_API_KEY;

      if (!apiKey || apiKey === "your_news_api_key") {
        updateResult(
          "NewsAPI",
          "error",
          "API key not configured",
          "Set VITE_NEWS_API_KEY in .env"
        );
        return;
      }

      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=${apiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        updateResult(
          "NewsAPI",
          "success",
          "API working",
          `${data.articles?.length || 0} articles fetched`
        );
      } else {
        const errorData = await response.json();
        updateResult(
          "NewsAPI",
          "error",
          `HTTP ${response.status}`,
          errorData.message || response.statusText
        );
      }
    } catch (error) {
      updateResult(
        "NewsAPI",
        "error",
        "Connection failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  const testTrends24 = async () => {
    try {
      const response = await fetch(
        "https://api.allorigins.win/get?url=" +
          encodeURIComponent("https://trends24.in/worldwide/")
      );

      if (response.ok) {
        const data = await response.json();
        if (data.contents && data.contents.includes("trends24")) {
          updateResult(
            "Trends24",
            "success",
            "Access working",
            "X/Twitter trends available via CORS proxy"
          );
        } else {
          updateResult(
            "Trends24",
            "error",
            "Content blocked",
            "CORS proxy returned unexpected content"
          );
        }
      } else {
        updateResult(
          "Trends24",
          "error",
          `HTTP ${response.status}`,
          response.statusText
        );
      }
    } catch (error) {
      updateResult(
        "Trends24",
        "error",
        "Connection failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    initializeResults();

    // Run tests sequentially to avoid rate limits
    await testSupabase();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testElevenLabs();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testTogetherAI();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testNewsAPI();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testTrends24();

    setTesting(false);
  };

  const getStatusIcon = (status: "pending" | "success" | "error") => {
    switch (status) {
      case "pending":
        return <Loader2 className="w-5 h-5 animate-spin text-blue-400" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const totalCount = results.length;

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-blue-400" />
        <h3 className="text-xl font-bold text-white">API Configuration Test</h3>
        <button
          onClick={runAllTests}
          disabled={testing}
          className="ml-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-600/50 disabled:to-purple-600/50 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${testing ? "animate-spin" : ""}`} />
          {testing ? "Testing..." : "Run Tests"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
          <p className="text-sm text-slate-300">
            Status:{" "}
            <span className="font-bold text-white">
              {successCount}/{totalCount} APIs working
            </span>
            {successCount === totalCount && (
              <span className="text-green-400 ml-2">
                🎉 All systems operational!
              </span>
            )}
            {successCount >= 2 && successCount < totalCount && (
              <span className="text-yellow-400 ml-2">
                ⚠️ Some fallbacks will be used
              </span>
            )}
            {successCount < 2 && (
              <span className="text-red-400 ml-2">
                ❌ Critical: Multiple APIs failing
              </span>
            )}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((result) => (
          <div
            key={result.name}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              result.status === "success"
                ? "bg-green-500/10 border-green-500/30"
                : result.status === "error"
                ? "bg-red-500/10 border-red-500/30"
                : "bg-slate-700/30 border-slate-600/30"
            }`}
          >
            {getStatusIcon(result.status)}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{result.name}</span>
                <span
                  className={`text-sm ${
                    result.status === "success"
                      ? "text-green-300"
                      : result.status === "error"
                      ? "text-red-300"
                      : "text-slate-300"
                  }`}
                >
                  {result.message}
                </span>
              </div>
              {result.details && (
                <p className="text-xs text-slate-400 mt-1">{result.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-400">
            Click "Run Tests" to verify your API configuration
          </p>
        </div>
      )}
    </div>
  );
}
