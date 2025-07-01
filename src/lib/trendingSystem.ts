import { supabase } from "./supabase";
import {
  generateTrendingTopics as generateAITopics,
  isTogetherConfigured,
} from "./together";
import {
  smartScrapingStrategy,
  getScrapingStatus,
  rateLimiter,
  getNewsAPIUsage,
} from "./socialScraper";
import { getAggregatedTrends } from "./trendAggregatorApis";

export interface TrendingTopic {
  id: string;
  source: string;
  raw_topic: string;
  summary: string;
  question_text: string;
  context: string;
  category: string;
  keywords: string[];
  trending_score: number;
  vote_count: number;
  is_active: boolean;
  is_safe: boolean;
  scraped_at: string;
  created_at: string;
  question_id?: string; // Optional link to questions table
}

export interface TrendVote {
  id: string;
  trending_topic_id: string;
  user_id: string | null;
  session_id: string | null;
  is_anonymous: boolean;
  created_at: string;
}

export interface CrownedTrend {
  id: string;
  trending_topic_id: string;
  vote_count: number;
  crowned_date: string;
  voice_script: string;
  created_at: string;
  trending_topic?: TrendingTopic;
}

export const TRENDING_SOURCES = {
  x_twitter: {
    name: "X (Twitter)",
    emoji: "🐦",
    color: "from-blue-500 to-blue-600",
  },
  facebook: {
    name: "Facebook",
    emoji: "📘",
    color: "from-blue-600 to-indigo-600",
  },
  reddit: { name: "Reddit", emoji: "🤖", color: "from-orange-500 to-red-500" },
  github: { name: "GitHub", emoji: "⭐", color: "from-gray-500 to-slate-600" },
  tiktok: { name: "TikTok", emoji: "🎵", color: "from-pink-500 to-purple-500" },
  news: { name: "NewsAPI", emoji: "📰", color: "from-gray-600 to-gray-700" },
  tech: {
    name: "Tech Trends",
    emoji: "💻",
    color: "from-green-500 to-teal-500",
  },
};

// Enhanced topic conversion with better AI prompting
export async function convertTopicsToPolls(
  topics: string[],
  source: string
): Promise<Partial<TrendingTopic>[]> {
  if (!isTogetherConfigured()) {
    // Enhanced fallback conversion
    return topics.map((topic) => ({
      source,
      raw_topic: topic,
      summary: topic.length > 100 ? topic.substring(0, 100) + "..." : topic,
      question_text: generateQuestionFromTopic(topic),
      context: `This topic is trending on ${
        TRENDING_SOURCES[source as keyof typeof TRENDING_SOURCES]?.name ||
        "social media"
      }`,
      category: categorizeTopicByKeywords(topic),
      keywords: extractKeywords(topic),
      trending_score: Math.floor(Math.random() * 40) + 60, // 60-100
      is_safe: moderateContent(topic),
      vote_count: 0,
      is_active: true,
    }));
  }

  const sourceInfo = TRENDING_SOURCES[source as keyof typeof TRENDING_SOURCES];
  const prompt = `You are an expert at converting trending social media topics into engaging yes/no poll questions for a global voting platform.

TRENDING TOPICS FROM ${sourceInfo?.name || source.toUpperCase()}:
${topics.map((topic, i) => `${i + 1}. ${topic}`).join("\n")}

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

SAFETY GUIDELINES:
- Reject topics promoting hate, violence, or discrimination
- Avoid overly political or inflammatory content
- Focus on constructive, thought-provoking questions
- Ensure global relevance and cultural sensitivity

Generate compelling questions that people worldwide would want to vote on!`;

  try {
    const response = await fetch(
      "https://api.together.xyz/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_TOGETHER_API_KEY}`,
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
      throw new Error(`Together AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from Together AI");
    }

    const processedTopics = JSON.parse(content);

    // Filter for safe topics and add source info
    return processedTopics
      .filter((topic: any) => topic.is_safe)
      .map((topic: any) => ({
        ...topic,
        source,
        vote_count: 0,
        is_active: true,
      }));
  } catch (error) {
    console.error("Error converting topics with AI:", error);
    // Fallback to enhanced manual conversion
    return topics.map((topic) => ({
      source,
      raw_topic: topic,
      summary: topic.length > 100 ? topic.substring(0, 100) + "..." : topic,
      question_text: generateQuestionFromTopic(topic),
      context: `This topic is trending on ${
        sourceInfo?.name || "social media"
      } and sparking global conversations.`,
      category: categorizeTopicByKeywords(topic),
      keywords: extractKeywords(topic),
      trending_score: Math.floor(Math.random() * 40) + 60,
      is_safe: moderateContent(topic),
      vote_count: 0,
      is_active: true,
    }));
  }
}

// Enhanced question generation
function generateQuestionFromTopic(topic: string): string {
  const lowerTopic = topic.toLowerCase();

  // Pattern-based question generation
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

  // Default patterns
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

// Enhanced categorization with better logic
function categorizeTopicByKeywords(topic: string): string {
  const lowerTopic = topic.toLowerCase();

  // Technology categories
  if (
    lowerTopic.match(
      /\b(ai|artificial intelligence|machine learning|blockchain|crypto|nft|tech|digital|cyber|robot|automation|data|software|app|platform|algorithm|cloud|iot|5g|quantum|virtual reality|vr|ar|augmented reality)\b/
    )
  ) {
    return "Technology";
  }

  // Health categories
  if (
    lowerTopic.match(
      /\b(health|medical|vaccine|virus|covid|pandemic|fitness|wellness|mental health|depression|anxiety|medicine|doctor|hospital|treatment|disease|drug|pharmaceutical)\b/
    )
  ) {
    return "Health";
  }

  // Environment categories
  if (
    lowerTopic.match(
      /\b(climate|environment|green|renewable|solar|wind|carbon|emission|sustainability|pollution|global warming|eco|biodiversity|conservation|recycling)\b/
    )
  ) {
    return "Environment";
  }

  // Politics categories
  if (
    lowerTopic.match(
      /\b(election|government|president|politician|policy|law|court|senate|congress|democracy|vote|campaign|political|regulation|tax|biden|trump)\b/
    )
  ) {
    return "Politics";
  }

  // Economy categories
  if (
    lowerTopic.match(
      /\b(economy|economic|finance|financial|market|stock|investment|inflation|recession|gdp|unemployment|job|work|wage|salary|bitcoin|cryptocurrency|bank|trading)\b/
    )
  ) {
    return "Economy";
  }

  // Entertainment categories
  if (
    lowerTopic.match(
      /\b(movie|film|tv|television|netflix|disney|music|concert|celebrity|actor|actress|singer|artist|entertainment|hollywood|streaming|gaming|video game|sport|football|basketball|olympics)\b/
    )
  ) {
    return "Entertainment";
  }

  // Social Issues
  if (
    lowerTopic.match(
      /\b(social|society|community|equality|rights|gender|race|discrimination|justice|protest|activism|diversity|inclusion|lgbt|feminism|immigration|refugee)\b/
    )
  ) {
    return "Social Issues";
  }

  // Science categories
  if (
    lowerTopic.match(
      /\b(science|research|scientist|study|discovery|space|nasa|mars|planet|physics|chemistry|biology|genetics|dna|evolution|astronomy|universe|laboratory)\b/
    )
  ) {
    return "Science";
  }

  // Education
  if (
    lowerTopic.match(
      /\b(education|school|university|college|student|teacher|learning|knowledge|degree|academic|curriculum|online learning|remote learning)\b/
    )
  ) {
    return "Education";
  }

  // Lifestyle
  if (
    lowerTopic.match(
      /\b(lifestyle|fashion|food|travel|home|family|relationship|dating|marriage|parenting|hobby|vacation|restaurant|cooking|style|trend)\b/
    )
  ) {
    return "Lifestyle";
  }

  // Default to News for current events that don't fit other categories
  return "News";
}

// Enhanced keyword extraction with better logic
function extractKeywords(topic: string): string[] {
  const commonWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "me",
    "him",
    "her",
    "us",
    "them",
    "my",
    "your",
    "his",
    "her",
    "its",
    "our",
    "their",
    "mine",
    "yours",
    "hers",
    "ours",
    "theirs",
    "about",
    "above",
    "across",
    "after",
    "against",
    "along",
    "among",
    "around",
    "as",
    "before",
    "behind",
    "below",
    "beneath",
    "beside",
    "between",
    "beyond",
    "during",
    "except",
    "from",
    "into",
    "like",
    "near",
    "since",
    "through",
    "throughout",
    "till",
    "toward",
    "under",
    "until",
    "up",
    "upon",
    "within",
    "without",
  ]);

  // Extract words, clean them, and filter
  const words = topic
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2 && !commonWords.has(word))
    .map((word) => word.trim())
    .filter((word) => word.length > 0);

  // Remove duplicates and take top 6 most relevant words
  const uniqueWords = [...new Set(words)];

  // Prioritize longer, more specific words
  const sortedWords = uniqueWords.sort((a, b) => {
    // Prioritize by length first, then alphabetically
    if (a.length !== b.length) {
      return b.length - a.length;
    }
    return a.localeCompare(b);
  });

  return sortedWords.slice(0, 6);
}

// Enhanced content moderation with better safety checks
function moderateContent(topic: string): boolean {
  const lowerTopic = topic.toLowerCase();

  // Explicit harmful content patterns
  const harmfulPatterns = [
    // Violence and harm
    /\b(kill|murder|death|suicide|harm|hurt|violence|weapon|gun|bomb|terrorist|attack|war|fight|beat|stab|shoot)\b/,
    // Hate speech and discrimination
    /\b(hate|racist|nazi|fascist|supremacist|bigot|slur)\b/,
    // Sexual content
    /\b(sex|sexual|porn|nude|naked|adult|xxx|erotic)\b/,
    // Drugs and illegal activities
    /\b(drug|cocaine|heroin|meth|illegal|criminal|crime|fraud|scam)\b/,
    // Spam and manipulation
    /\b(spam|clickbait|fake|lies|manipulation|propaganda)\b/,
  ];

  // Check for harmful patterns
  for (const pattern of harmfulPatterns) {
    if (pattern.test(lowerTopic)) {
      console.warn("Content moderation: Blocked harmful content:", topic);
      return false;
    }
  }

  // Additional checks for quality
  if (topic.length < 10 || topic.length > 500) {
    console.warn(
      "Content moderation: Topic length out of bounds:",
      topic.length
    );
    return false;
  }

  // Check for excessive special characters or numbers
  const specialCharCount = (topic.match(/[^a-zA-Z0-9\s]/g) || []).length;
  if (specialCharCount > topic.length * 0.3) {
    console.warn("Content moderation: Too many special characters");
    return false;
  }

  return true;
}

// Enhanced trending topics generation with reliable sources (no more X/Twitter scraping)
export async function generateTrendingTopics(): Promise<TrendingTopic[]> {
  // Use reliable sources: Reddit + News + GitHub (no more unreliable X/Twitter scraping)
  const sources = ["reddit", "news", "github"];
  const allTopics: TrendingTopic[] = [];
  const scrapingStatus = getScrapingStatus();
  const newsUsage = getNewsAPIUsage();

  console.log(
    "🚀 Starting enhanced trending topics generation with reliable sources..."
  );
  console.log("📊 Scraping status:", scrapingStatus);
  console.log(
    `📰 NewsAPI usage: ${newsUsage.used}/${newsUsage.total} (${newsUsage.remaining} remaining)`
  );

  // Use smart scraping strategy with reliable sources only
  const scrapedTopics = await smartScrapingStrategy(sources, 20);

  for (const [source, rawTopics] of Object.entries(scrapedTopics)) {
    if (rawTopics.length === 0) continue;

    try {
      console.log(`🤖 Processing ${rawTopics.length} topics from ${source}...`);

      const processedTopics = await convertTopicsToPolls(rawTopics, source);
      console.log(
        `✅ Processed ${processedTopics.length} topics from ${source}`
      );

      // Store in database
      for (const topic of processedTopics) {
        if (!topic.is_safe) {
          console.log(`⚠️ Skipping unsafe topic: ${topic.question_text}`);
          continue;
        }

        try {
          const { data, error } = await supabase
            .from("trending_topics")
            .insert({
              source: topic.source,
              raw_topic: topic.raw_topic,
              summary: topic.summary,
              question_text: topic.question_text,
              context: topic.context,
              category: topic.category,
              keywords: topic.keywords,
              trending_score: topic.trending_score,
              is_safe: topic.is_safe,
              is_active: true,
              vote_count: 0,
            })
            .select()
            .single();

          if (error) {
            console.error("Error storing trending topic:", error);
          } else if (data) {
            // Also create a corresponding question record for voting
            const { data: questionData, error: questionError } = await supabase
              .from("questions")
              .insert({
                text: data.question_text,
                trending_topic_id: data.id,
                source: "trending",
                is_trending: true,
                trending_score: data.trending_score,
                metadata: {
                  category: data.category,
                  keywords: data.keywords,
                  context: data.context,
                },
                moderation_status: "approved",
              })
              .select()
              .single();

            if (questionError) {
              console.error("Error creating question record:", questionError);
            } else {
              console.log(
                `✅ Created question and trending topic: ${data.question_text.substring(
                  0,
                  50
                )}...`
              );
            }

            allTopics.push(data);
          }
        } catch (insertError) {
          console.error("Database insertion error:", insertError);
        }
      }

      // Update last scraped timestamp
      localStorage.setItem(`last_scraped_${source}`, new Date().toISOString());
    } catch (error) {
      console.error(`❌ Error processing ${source}:`, error);
      continue; // Continue with other sources
    }
  }

  // Log final NewsAPI usage
  const finalUsage = getNewsAPIUsage();
  console.log(
    `📊 Final NewsAPI usage: ${finalUsage.used}/${finalUsage.total} (${finalUsage.remaining} remaining)`
  );
  console.log(
    `🎉 Generated ${allTopics.length} trending topics from ${sources.length} sources!`
  );

  return allTopics;
}

// Get active trending topics for voting (sorted by vote count for leaderboard)
export async function getActiveTrendingTopics(): Promise<TrendingTopic[]> {
  try {
    // Add cache busting with timestamp
    const cacheKey = `trending_topics_${Date.now()}`;
    console.log("🔄 Fetching fresh trending topics with cache key:", cacheKey);

    const { data, error } = await supabase
      .from("trending_leaderboard")
      .select("*")
      .limit(20);

    if (error) {
      console.error("Error fetching trending leaderboard:", error);
      // Fallback to original query if view fails
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("trending_topics")
        .select("*")
        .eq("is_active", true)
        .eq("is_safe", true)
        .order("vote_count", { ascending: false })
        .order("trending_score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);

      if (fallbackError) {
        console.error("Fallback query also failed:", fallbackError);
        throw fallbackError;
      }

      console.log(
        "✅ Using fallback query, found:",
        fallbackData?.length,
        "topics"
      );
      return fallbackData || [];
    }

    console.log("✅ Using leaderboard view, found:", data?.length, "topics");
    return data || [];
  } catch (err) {
    console.error("Error in getActiveTrendingTopics:", err);
    return [];
  }
}

// Vote for a trending topic
export async function voteForTrend(
  topicId: string
): Promise<{ error: string | null }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const voteData = {
      trending_topic_id: topicId,
      user_id: user?.id || null,
      session_id: user ? null : getSessionId(),
      is_anonymous: !user,
    };

    const { error } = await supabase.from("trend_votes").insert(voteData);

    if (error) {
      if (error.code === "23505") {
        return { error: "You have already voted for this trend" };
      }
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    console.error("Error voting for trend:", err);
    return { error: "An unexpected error occurred" };
  }
}

// Get user's votes for trending topics
export async function getUserTrendVotes(): Promise<string[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase.from("trend_votes").select("trending_topic_id");

    if (user) {
      query = query.eq("user_id", user.id);
    } else {
      query = query.eq("session_id", getSessionId()).eq("is_anonymous", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching user votes:", error);
      return [];
    }

    return data?.map((vote: any) => vote.trending_topic_id) || [];
  } catch (err) {
    console.error("Error getting user trend votes:", err);
    return [];
  }
}

// Get today's crowned trend
export async function getTodaysCrownedTrend(): Promise<CrownedTrend | null> {
  try {
    const { data, error } = await supabase
      .from("crowned_trends")
      .select(
        `
        *,
        trending_topic:trending_topics(*)
      `
      )
      .eq("crowned_date", new Date().toISOString().split("T")[0])
      .maybeSingle();

    if (error) {
      console.error("Error fetching crowned trend:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error in getTodaysCrownedTrend:", err);
    return null;
  }
}

// Crown the daily trend (run this daily) - Fixed to allow topics with 0 votes
export async function crownDailyTrend(): Promise<CrownedTrend | null> {
  try {
    // Get the top trending topic for today (allow 0 votes)
    const { data: topTrend, error: fetchError } = await supabase
      .from("trending_topics")
      .select("*")
      .eq("is_active", true)
      .eq("is_safe", true)
      .order("vote_count", { ascending: false })
      .order("trending_score", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Database error fetching trending topics:", fetchError);
      throw new Error(`Database error: ${fetchError.message}`);
    }

    if (!topTrend) {
      throw new Error("No active trending topics found in the database");
    }

    // Create enhanced voice script
    const sourceInfo =
      TRENDING_SOURCES[topTrend.source as keyof typeof TRENDING_SOURCES];
    const voteText =
      topTrend.vote_count > 0
        ? `This topic received ${topTrend.vote_count} votes from users around the globe, making it the most influential trend of the day.`
        : `While this topic hasn't received votes yet, it has the highest trending score of ${topTrend.trending_score}, showing its potential for massive global impact.`;

    const voiceScript = `🏆 Today's crowned trend comes from ${
      sourceInfo?.name || "social media"
    }! 
    
    The question that captured attention is: ${topTrend.question_text}
    
    ${voteText}
    
    ${
      topTrend.context ||
      "This topic sparked interest and discussion across social media platforms."
    }
    
    The trending score reached ${
      topTrend.trending_score
    } out of 100, indicating its significance in current global conversations.
    
    Congratulations to this trend for winning today's crown! 👑`;

    // Insert or update crowned trend for today
    const { data, error } = await supabase
      .from("crowned_trends")
      .upsert({
        trending_topic_id: topTrend.id,
        vote_count: topTrend.vote_count,
        voice_script: voiceScript,
        crowned_date: new Date().toISOString().split("T")[0],
      })
      .select(
        `
        *,
        trending_topic:trending_topics(*)
      `
      )
      .single();

    if (error) {
      console.error("Error crowning daily trend:", error);
      throw new Error(`Failed to crown trend: ${error.message}`);
    }

    return data;
  } catch (err) {
    console.error("Error in crownDailyTrend:", err);
    throw err;
  }
}

// Helper function to get session ID for anonymous users
function getSessionId(): string {
  const storageKey = "voice_voter_session";
  let sessionId = localStorage.getItem(storageKey);

  if (!sessionId) {
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, sessionId);
  }

  return sessionId;
}

// Get scraping statistics with NewsAPI usage
export function getScrapingStats(): {
  totalSources: number;
  configuredSources: number;
  lastScrapedTimes: Record<string, string>;
  newsAPIUsage: any;
} {
  const status = getScrapingStatus();
  const configuredCount = Object.values(status).filter(
    (s) => s.configured
  ).length;
  const lastScrapedTimes: Record<string, string> = {};

  Object.entries(status).forEach(([source, info]) => {
    if (info.lastScraped) {
      lastScrapedTimes[source] = new Date(info.lastScraped).toLocaleString();
    }
  });

  return {
    totalSources: Object.keys(status).length,
    configuredSources: configuredCount,
    lastScrapedTimes,
    newsAPIUsage: getNewsAPIUsage(),
  };
}

// Convert trending topics to voteable questions in the questions table
export async function convertTrendingTopicsToQuestions(): Promise<{
  created: number;
  error: string | null;
}> {
  try {
    console.log("🔄 Converting trending topics to voteable questions...");

    // Get trending topics that haven't been converted to questions yet
    const { data: trendingTopics, error: fetchError } = await supabase
      .from("trending_topics")
      .select("*")
      .eq("is_active", true)
      .eq("is_safe", true)
      .is("question_id", null) // Only get topics that haven't been converted yet
      .limit(10);

    if (fetchError) {
      console.error("Error fetching trending topics:", fetchError);
      return { created: 0, error: fetchError.message };
    }

    if (!trendingTopics || trendingTopics.length === 0) {
      console.log("✅ No new trending topics to convert");
      return { created: 0, error: null };
    }

    let created = 0;
    for (const topic of trendingTopics) {
      try {
        // Create a question from the trending topic
        const { data: question, error: questionError } = await supabase
          .from("questions")
          .insert({
            question_text: topic.question_text,
            source: `trending_${topic.source}`,
            context: topic.context,
            category: topic.category,
            is_active: true,
            trending_topic_id: topic.id, // Link back to trending topic
          })
          .select()
          .single();

        if (questionError) {
          console.error(
            `Error creating question for topic ${topic.id}:`,
            questionError
          );
          continue;
        }

        // Update the trending topic with the question_id
        const { error: updateError } = await supabase
          .from("trending_topics")
          .update({ question_id: question.id })
          .eq("id", topic.id);

        if (updateError) {
          console.error(
            `Error updating trending topic ${topic.id}:`,
            updateError
          );
        } else {
          console.log(
            `✅ Created question for: ${topic.question_text.substring(
              0,
              50
            )}...`
          );
          created++;
        }
      } catch (err) {
        console.error(`Error processing topic ${topic.id}:`, err);
        continue;
      }
    }

    console.log(
      `🎉 Successfully converted ${created} trending topics to questions!`
    );
    return { created, error: null };
  } catch (err) {
    console.error("Error in convertTrendingTopicsToQuestions:", err);
    return {
      created: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Get trending topics with their questions for Yes/No voting
export async function getTrendingQuestionsForVoting(): Promise<
  Array<TrendingTopic & { question_id: string }>
> {
  try {
    // First try the optimized leaderboard view
    const { data, error } = await supabase
      .from("trending_leaderboard")
      .select("*")
      .limit(20);

    if (error) {
      console.error("Error fetching trending leaderboard:", error);

      // Fallback to direct query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("trending_topics")
        .select("*")
        .eq("is_active", true)
        .eq("is_safe", true)
        .not("question_text", "is", null)
        .order("vote_count", { ascending: false })
        .order("trending_score", { ascending: false })
        .limit(20);

      if (fallbackError) {
        console.error("Fallback query also failed:", fallbackError);
        return [];
      }

      // Map fallback data
      return (fallbackData || []).map((topic: TrendingTopic) => ({
        ...topic,
        question_id: topic.id,
      }));
    }

    // Map leaderboard data (it already has total_votes which maps to vote_count)
    return (data || []).map((topic: any) => ({
      ...topic,
      vote_count: topic.total_votes || topic.vote_count || 0,
      question_id: topic.id,
    }));
  } catch (err) {
    console.error("Error in getTrendingQuestionsForVoting:", err);
    return [];
  }
}
