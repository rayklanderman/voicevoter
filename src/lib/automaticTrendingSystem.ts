// Automatic Trending System - Updates every 3 hours and responds to breaking news
import {
  generateTrendingTopics,
  getActiveTrendingTopics,
  TrendingTopic,
} from "./trendingSystem";
import { smartScrapingStrategy, getNewsAPIUsage } from "./socialScraper";
import { supabase } from "./supabase";

interface TrendingUpdate {
  lastUpdate: string;
  nextUpdate: string;
  isUpdating: boolean;
  breakingNewsDetected: boolean;
}

class AutomaticTrendingSystem {
  private updateInterval: NodeJS.Timeout | null = null;
  private breakingNewsInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 3 * 60 * 60 * 1000; // 3 hours
  private readonly BREAKING_NEWS_CHECK = 15 * 60 * 1000; // 15 minutes
  private readonly STORAGE_KEY = "trending_system_status";
  private isInitialized = false;

  constructor() {
    // Don't auto-initialize in constructor to prevent issues
    // Initialize will be called explicitly
  }

  public initialize() {
    if (this.isInitialized) {
      console.log("🔄 Automatic Trending System already initialized");
      return;
    }

    console.log(
      "🚀 Initializing Automatic Trending System with NewsAPI integration..."
    );

    // Start the automatic update cycle
    this.startAutomaticUpdates();

    // Start breaking news monitoring (optimized for NewsAPI)
    this.startBreakingNewsMonitoring();

    // Check if we need an immediate update on startup
    this.checkForImmediateUpdate();

    this.isInitialized = true;

    // Clean up on page unload
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.destroy();
      });
    }
  }

  private startAutomaticUpdates() {
    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Set up recurring updates every 3 hours
    this.updateInterval = setInterval(() => {
      console.log("⏰ Scheduled trending topics update triggered");
      this.performTrendingUpdate("scheduled");
    }, this.UPDATE_INTERVAL);

    console.log("✅ Automatic updates scheduled every 3 hours");
  }

  private startBreakingNewsMonitoring() {
    // Clear any existing interval
    if (this.breakingNewsInterval) {
      clearInterval(this.breakingNewsInterval);
    }

    // Check for breaking news every 15 minutes (optimized for NewsAPI quota)
    this.breakingNewsInterval = setInterval(() => {
      this.checkForBreakingNews();
    }, this.BREAKING_NEWS_CHECK);

    console.log(
      "✅ Breaking news monitoring started (every 15 minutes, NewsAPI optimized)"
    );
  }

  private async checkForImmediateUpdate() {
    const status = this.getSystemStatus();
    const now = Date.now();
    const lastUpdate = new Date(status.lastUpdate).getTime();
    const timeSinceUpdate = now - lastUpdate;

    // If it's been more than 3 hours since last update, update immediately
    if (timeSinceUpdate > this.UPDATE_INTERVAL) {
      console.log(
        "🔄 Performing immediate update - last update was too long ago"
      );
      await this.performTrendingUpdate("startup");
    }

    // If no topics exist, generate some immediately
    const existingTopics = await getActiveTrendingTopics();
    if (existingTopics.length === 0) {
      console.log("🆕 No trending topics found - generating initial set");
      await this.performTrendingUpdate("initial");
    }
  }

  private async checkForBreakingNews() {
    try {
      const newsUsage = getNewsAPIUsage();

      // Only check for breaking news if we have sufficient NewsAPI quota
      if (newsUsage.remaining < 50) {
        console.log(
          "📰 Skipping breaking news check - preserving NewsAPI quota"
        );
        return;
      }

      console.log("📰 Checking for breaking news with NewsAPI...");

      // Use smart scraping with high priority for breaking news
      const breakingNews = await smartScrapingStrategy(["news"], 10);

      if (breakingNews.news && breakingNews.news.length === 0) return;

      // Check if any news is significantly different from current topics
      const currentTopics = await getActiveTrendingTopics();
      const isBreakingNews = await this.detectBreakingNews(
        breakingNews.news || [],
        currentTopics
      );

      if (isBreakingNews) {
        console.log(
          "🚨 Breaking news detected! Triggering immediate update..."
        );
        await this.performTrendingUpdate("breaking_news");

        // Update status to indicate breaking news was detected
        this.updateSystemStatus({ breakingNewsDetected: true });
      }
    } catch (error) {
      console.error("❌ Error checking for breaking news:", error);
    }
  }

  private async detectBreakingNews(
    newTopics: string[],
    currentTopics: TrendingTopic[]
  ): Promise<boolean> {
    // Enhanced breaking news detection with NewsAPI-specific keywords
    const urgentKeywords = [
      "breaking",
      "urgent",
      "emergency",
      "crisis",
      "disaster",
      "attack",
      "earthquake",
      "hurricane",
      "explosion",
      "accident",
      "death",
      "dies",
      "war",
      "conflict",
      "shooting",
      "fire",
      "flood",
      "storm",
      "crash",
      "resignation",
      "elected",
      "winner",
      "victory",
      "defeat",
      "scandal",
      "breakthrough",
      "discovery",
      "first",
      "record",
      "historic",
      "major",
    ];

    const currentTopicTexts = currentTopics.map((t) =>
      t.raw_topic.toLowerCase()
    );

    for (const topic of newTopics) {
      const topicLower = topic.toLowerCase();

      // Check if this topic contains urgent keywords
      const hasUrgentKeywords = urgentKeywords.some((keyword) =>
        topicLower.includes(keyword)
      );

      // Check if this topic is significantly different from current topics
      const isSimilarToExisting = currentTopicTexts.some(
        (existing) => this.calculateSimilarity(topicLower, existing) > 0.7
      );

      if (hasUrgentKeywords && !isSimilarToExisting) {
        console.log(`🚨 Breaking news detected: ${topic}`);
        return true;
      }
    }

    return false;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation based on common words
    const words1 = str1.split(" ").filter((w) => w.length > 3);
    const words2 = str2.split(" ").filter((w) => w.length > 3);

    const commonWords = words1.filter((word) => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);

    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  public async performTrendingUpdate(
    trigger:
      | "scheduled"
      | "breaking_news"
      | "startup"
      | "initial"
      | "manual" = "manual"
  ): Promise<TrendingTopic[]> {
    try {
      console.log(
        `🔄 Starting trending topics update (trigger: ${trigger})...`
      );

      // Log NewsAPI usage before update
      const newsUsage = getNewsAPIUsage();
      console.log(
        `📊 NewsAPI usage before update: ${newsUsage.used}/${newsUsage.total} (${newsUsage.remaining} remaining)`
      );

      // Update status to show we're updating
      this.updateSystemStatus({
        isUpdating: true,
        breakingNewsDetected: trigger === "breaking_news",
      });

      // Generate new trending topics with optimized NewsAPI usage
      const newTopics = await generateTrendingTopics();

      if (newTopics.length > 0) {
        // Remove old topics with no votes (keep topics with votes for historical data)
        await this.cleanupOldTopics();

        console.log(
          `✅ Successfully updated trending topics (${newTopics.length} new topics)`
        );

        // Log NewsAPI usage after update
        const finalUsage = getNewsAPIUsage();
        console.log(
          `📊 NewsAPI usage after update: ${finalUsage.used}/${finalUsage.total} (${finalUsage.remaining} remaining)`
        );

        // Update system status
        this.updateSystemStatus({
          lastUpdate: new Date().toISOString(),
          nextUpdate: new Date(Date.now() + this.UPDATE_INTERVAL).toISOString(),
          isUpdating: false,
          breakingNewsDetected: false,
        });

        // Broadcast update to any listening components
        this.broadcastUpdate(trigger, newTopics.length);

        return newTopics;
      } else {
        throw new Error("No new topics generated");
      }
    } catch (error) {
      console.error("❌ Error updating trending topics:", error);

      this.updateSystemStatus({
        isUpdating: false,
        breakingNewsDetected: false,
      });

      throw error;
    }
  }

  private async cleanupOldTopics() {
    try {
      // Deactivate topics older than 24 hours with no votes
      const { error } = await supabase
        .from("trending_topics")
        .update({ is_active: false })
        .lt(
          "created_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        )
        .eq("vote_count", 0);

      if (error) {
        console.error("Error cleaning up old topics:", error);
      } else {
        console.log("🧹 Cleaned up old trending topics with no votes");
      }
    } catch (error) {
      console.error("Error in cleanup:", error);
    }
  }

  private broadcastUpdate(trigger: string, topicCount: number) {
    // Dispatch custom event for components to listen to
    const event = new CustomEvent("trendingTopicsUpdated", {
      detail: { trigger, topicCount, timestamp: new Date().toISOString() },
    });
    window.dispatchEvent(event);
  }

  public getSystemStatus(): TrendingUpdate {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const defaultStatus: TrendingUpdate = {
      lastUpdate: new Date(Date.now() - this.UPDATE_INTERVAL).toISOString(),
      nextUpdate: new Date(Date.now() + this.UPDATE_INTERVAL).toISOString(),
      isUpdating: false,
      breakingNewsDetected: false,
    };

    if (!stored) {
      return defaultStatus;
    }

    try {
      return { ...defaultStatus, ...JSON.parse(stored) };
    } catch {
      return defaultStatus;
    }
  }

  private updateSystemStatus(updates: Partial<TrendingUpdate>) {
    const current = this.getSystemStatus();
    const updated = { ...current, ...updates };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  public getTimeUntilNextUpdate(): string {
    const status = this.getSystemStatus();
    const nextUpdate = new Date(status.nextUpdate).getTime();
    const now = Date.now();
    const timeLeft = nextUpdate - now;

    if (timeLeft <= 0) {
      return "Updating soon...";
    }

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  public getNewsAPIStatus(): { usage: any; strategy: string } {
    const usage = getNewsAPIUsage();
    const hour = new Date().getHours();
    const isPeakHours = hour >= 6 && hour <= 22;

    let strategy = "Conservative";
    if (usage.remaining > 200) {
      strategy = isPeakHours ? "Aggressive" : "Moderate";
    } else if (usage.remaining > 100) {
      strategy = "Moderate";
    }

    return { usage, strategy };
  }

  public destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.breakingNewsInterval) {
      clearInterval(this.breakingNewsInterval);
      this.breakingNewsInterval = null;
    }

    console.log("🛑 Automatic Trending System stopped");
  }
}

// Create singleton instance
export const automaticTrendingSystem = new AutomaticTrendingSystem();

// Initialize the system when this module is imported
if (typeof window !== "undefined") {
  // Only initialize in browser environment
  automaticTrendingSystem.initialize();
}

// Export functions for manual control
export const {
  performTrendingUpdate,
  getSystemStatus,
  getTimeUntilNextUpdate,
  getNewsAPIStatus,
} = automaticTrendingSystem;
