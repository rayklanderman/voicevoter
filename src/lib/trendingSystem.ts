import { supabase } from './supabase';
import { generateTrendingTopics as generateAITopics, isTogetherConfigured } from './together';
import { smartScrapingStrategy, getScrapingStatus, rateLimiter, getNewsAPIUsage } from './socialScraper';

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
  'x_twitter': { name: 'X (Twitter)', emoji: '🐦', color: 'from-blue-500 to-blue-600' },
  'facebook': { name: 'Facebook', emoji: '📘', color: 'from-blue-600 to-indigo-600' },
  'reddit': { name: 'Reddit', emoji: '🤖', color: 'from-orange-500 to-red-500' },
  'tiktok': { name: 'TikTok', emoji: '🎵', color: 'from-pink-500 to-purple-500' },
  'news': { name: 'NewsAPI', emoji: '📰', color: 'from-gray-600 to-gray-700' },
  'tech': { name: 'Tech Trends', emoji: '💻', color: 'from-green-500 to-teal-500' }
};

// Enhanced topic conversion with better AI prompting
export async function convertTopicsToPolls(topics: string[], source: string): Promise<Partial<TrendingTopic>[]> {
  if (!isTogetherConfigured()) {
    // Enhanced fallback conversion
    return topics.map(topic => ({
      source,
      raw_topic: topic,
      summary: topic.length > 100 ? topic.substring(0, 100) + '...' : topic,
      question_text: generateQuestionFromTopic(topic),
      context: `This topic is trending on ${TRENDING_SOURCES[source as keyof typeof TRENDING_SOURCES]?.name || 'social media'}`,
      category: categorizeTopicByKeywords(topic),
      keywords: extractKeywords(topic),
      trending_score: Math.floor(Math.random() * 40) + 60, // 60-100
      is_safe: moderateContent(topic),
      vote_count: 0,
      is_active: true
    }));
  }

  const sourceInfo = TRENDING_SOURCES[source as keyof typeof TRENDING_SOURCES];
  const prompt = `You are an expert at converting trending social media topics into engaging yes/no poll questions for a global voting platform.

TRENDING TOPICS FROM ${sourceInfo?.name || source.toUpperCase()}:
${topics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}

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
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error(`Together AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from Together AI');
    }

    const processedTopics = JSON.parse(content);
    
    // Filter for safe topics and add source info
    return processedTopics
      .filter((topic: any) => topic.is_safe)
      .map((topic: any) => ({
        ...topic,
        source,
        vote_count: 0,
        is_active: true
      }));

  } catch (error) {
    console.error('Error converting topics with AI:', error);
    // Fallback to enhanced manual conversion
    return topics.map(topic => ({
      source,
      raw_topic: topic,
      summary: topic.length > 100 ? topic.substring(0, 100) + '...' : topic,
      question_text: generateQuestionFromTopic(topic),
      context: `This topic is trending on ${sourceInfo?.name || 'social media'} and sparking global conversations.`,
      category: categorizeTopicByKeywords(topic),
      keywords: extractKeywords(topic),
      trending_score: Math.floor(Math.random() * 40) + 60,
      is_safe: moderateContent(topic),
      vote_count: 0,
      is_active: true
    }));
  }
}

// Enhanced question generation
function generateQuestionFromTopic(topic: string): string {
  const lowerTopic = topic.toLowerCase();
  
  // Pattern-based question generation
  if (lowerTopic.includes('should') || lowerTopic.includes('must') || lowerTopic.includes('need to')) {
    return topic.endsWith('?') ? topic : `${topic}?`;
  }
  
  if (lowerTopic.includes('ban') || lowerTopic.includes('prohibit')) {
    return `Should this be implemented: ${topic}?`;
  }
  
  if (lowerTopic.includes('breakthrough') || lowerTopic.includes('discovery')) {
    return `Should this innovation be widely adopted: ${topic}?`;
  }
  
  if (lowerTopic.includes('trend') || lowerTopic.includes('viral')) {
    return `Is this trend beneficial for society: ${topic}?`;
  }
  
  // Default patterns
  const starters = [
    'Should society embrace',
    'Is it time to support',
    'Should we prioritize',
    'Is this the future we want',
    'Should this become mainstream'
  ];
  
  const randomStarter = starters[Math.floor(Math.random() * starters.length)];
  return `${randomStarter}: ${topic}?`;
}

// Enhanced categorization
function categorizeTopicByKeywords(topic: string): string {
  const lowerTopic = topic.toLowerCase();
  
  const categories = {
    'Technology': ['ai', 'artificial intelligence', 'robot', 'tech', 'digital', 'cyber', 'internet', 'app', 'software', 'computer', 'quantum', 'blockchain'],
    'Health': ['health', 'medical', 'vaccine', 'disease', 'therapy', 'treatment', 'medicine', 'hospital', 'doctor', 'mental health'],
    'Environment': ['climate', 'environment', 'green', 'sustainable', 'carbon', 'renewable', 'pollution', 'ocean', 'forest', 'energy'],
    'Politics': ['government', 'election', 'policy', 'law', 'political', 'democracy', 'vote', 'president', 'congress', 'regulation'],
    'Entertainment': ['movie', 'music', 'celebrity', 'film', 'show', 'entertainment', 'actor', 'singer', 'netflix', 'streaming'],
    'Sports': ['sport', 'game', 'team', 'player', 'championship', 'olympic', 'football', 'basketball', 'soccer', 'athlete'],
    'Economy': ['economy', 'financial', 'money', 'market', 'business', 'investment', 'crypto', 'stock', 'bank', 'trade'],
    'Science': ['science', 'research', 'study', 'discovery', 'experiment', 'space', 'mars', 'nasa', 'physics', 'chemistry'],
    'Social Issues': ['social', 'society', 'community', 'rights', 'equality', 'justice', 'protest', 'movement', 'culture', 'diversity']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerTopic.includes(keyword))) {
      return category;
    }
  }
  
  return 'Lifestyle';
}

// Enhanced keyword extraction
function extractKeywords(topic: string): string[] {
  const words = topic.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'were', 'said', 'what', 'when', 'where', 'would', 'could', 'should'].includes(word));
  
  // Get unique words and limit to 5
  return [...new Set(words)].slice(0, 5);
}

// Enhanced content moderation
function moderateContent(text: string): boolean {
  const inappropriateKeywords = [
    'hate', 'violence', 'kill', 'death', 'murder', 'terrorist', 'bomb', 'weapon',
    'racist', 'sexist', 'discrimination', 'harassment', 'abuse', 'assault',
    'explicit', 'nsfw', 'porn', 'sex', 'drug', 'illegal', 'criminal'
  ];

  const lowerText = text.toLowerCase();
  return !inappropriateKeywords.some(keyword => lowerText.includes(keyword));
}

// Enhanced trending topics generation with optimized NewsAPI usage
export async function generateTrendingTopics(): Promise<TrendingTopic[]> {
  const sources = ['x_twitter', 'reddit', 'news'];
  const allTopics: TrendingTopic[] = [];
  const scrapingStatus = getScrapingStatus();
  const newsUsage = getNewsAPIUsage();

  console.log('🚀 Starting enhanced trending topics generation with NewsAPI optimization...');
  console.log('📊 Scraping status:', scrapingStatus);
  console.log(`📰 NewsAPI usage: ${newsUsage.used}/${newsUsage.total} (${newsUsage.remaining} remaining)`);

  // Use smart scraping strategy to optimize NewsAPI usage
  const scrapedTopics = await smartScrapingStrategy(sources, 20);
  
  for (const [source, rawTopics] of Object.entries(scrapedTopics)) {
    if (rawTopics.length === 0) continue;
    
    try {
      console.log(`🤖 Processing ${rawTopics.length} topics from ${source}...`);
      
      const processedTopics = await convertTopicsToPolls(rawTopics, source);
      console.log(`✅ Processed ${processedTopics.length} topics from ${source}`);

      // Store in database
      for (const topic of processedTopics) {
        if (!topic.is_safe) {
          console.log(`⚠️ Skipping unsafe topic: ${topic.question_text}`);
          continue;
        }

        try {
          const { data, error } = await supabase
            .from('trending_topics')
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
              vote_count: 0
            })
            .select()
            .single();

          if (error) {
            console.error('Error storing trending topic:', error);
          } else if (data) {
            allTopics.push(data);
            console.log(`✅ Stored: ${data.question_text.substring(0, 50)}...`);
          }
        } catch (insertError) {
          console.error('Database insertion error:', insertError);
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
  console.log(`📊 Final NewsAPI usage: ${finalUsage.used}/${finalUsage.total} (${finalUsage.remaining} remaining)`);
  console.log(`🎉 Generated ${allTopics.length} trending topics from ${sources.length} sources!`);
  
  return allTopics;
}

// Get active trending topics for voting (sorted by vote count for leaderboard)
export async function getActiveTrendingTopics(): Promise<TrendingTopic[]> {
  try {
    const { data, error } = await supabase
      .from('trending_topics')
      .select('*')
      .eq('is_active', true)
      .eq('is_safe', true)
      .order('vote_count', { ascending: false })
      .order('trending_score', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching trending topics:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('Error in getActiveTrendingTopics:', err);
    return [];
  }
}

// Vote for a trending topic
export async function voteForTrend(topicId: string): Promise<{ error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const voteData = {
      trending_topic_id: topicId,
      user_id: user?.id || null,
      session_id: user ? null : getSessionId(),
      is_anonymous: !user
    };

    const { error } = await supabase
      .from('trend_votes')
      .insert(voteData);

    if (error) {
      if (error.code === '23505') {
        return { error: 'You have already voted for this trend' };
      }
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    console.error('Error voting for trend:', err);
    return { error: 'An unexpected error occurred' };
  }
}

// Get user's votes for trending topics
export async function getUserTrendVotes(): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('trend_votes')
      .select('trending_topic_id');

    if (user) {
      query = query.eq('user_id', user.id);
    } else {
      query = query.eq('session_id', getSessionId()).eq('is_anonymous', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user votes:', error);
      return [];
    }

    return data?.map(vote => vote.trending_topic_id) || [];
  } catch (err) {
    console.error('Error getting user trend votes:', err);
    return [];
  }
}

// Get today's crowned trend
export async function getTodaysCrownedTrend(): Promise<CrownedTrend | null> {
  try {
    const { data, error } = await supabase
      .from('crowned_trends')
      .select(`
        *,
        trending_topic:trending_topics(*)
      `)
      .eq('crowned_date', new Date().toISOString().split('T')[0])
      .maybeSingle();

    if (error) {
      console.error('Error fetching crowned trend:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in getTodaysCrownedTrend:', err);
    return null;
  }
}

// Crown the daily trend (run this daily) - Fixed to allow topics with 0 votes
export async function crownDailyTrend(): Promise<CrownedTrend | null> {
  try {
    // Get the top trending topic for today (allow 0 votes)
    const { data: topTrend, error: fetchError } = await supabase
      .from('trending_topics')
      .select('*')
      .eq('is_active', true)
      .eq('is_safe', true)
      .order('vote_count', { ascending: false })
      .order('trending_score', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Database error fetching trending topics:', fetchError);
      throw new Error(`Database error: ${fetchError.message}`);
    }

    if (!topTrend) {
      throw new Error('No active trending topics found in the database');
    }

    // Create enhanced voice script
    const sourceInfo = TRENDING_SOURCES[topTrend.source as keyof typeof TRENDING_SOURCES];
    const voteText = topTrend.vote_count > 0 
      ? `This topic received ${topTrend.vote_count} votes from users around the globe, making it the most influential trend of the day.`
      : `While this topic hasn't received votes yet, it has the highest trending score of ${topTrend.trending_score}, showing its potential for massive global impact.`;

    const voiceScript = `🏆 Today's crowned trend comes from ${sourceInfo?.name || 'social media'}! 
    
    The question that captured attention is: ${topTrend.question_text}
    
    ${voteText}
    
    ${topTrend.context || 'This topic sparked interest and discussion across social media platforms.'}
    
    The trending score reached ${topTrend.trending_score} out of 100, indicating its significance in current global conversations.
    
    Congratulations to this trend for winning today's crown! 👑`;

    // Insert or update crowned trend for today
    const { data, error } = await supabase
      .from('crowned_trends')
      .upsert({
        trending_topic_id: topTrend.id,
        vote_count: topTrend.vote_count,
        voice_script: voiceScript,
        crowned_date: new Date().toISOString().split('T')[0]
      })
      .select(`
        *,
        trending_topic:trending_topics(*)
      `)
      .single();

    if (error) {
      console.error('Error crowning daily trend:', error);
      throw new Error(`Failed to crown trend: ${error.message}`);
    }

    return data;
  } catch (err) {
    console.error('Error in crownDailyTrend:', err);
    throw err;
  }
}

// Helper function to get session ID for anonymous users
function getSessionId(): string {
  const storageKey = 'voice_voter_session';
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
  const configuredCount = Object.values(status).filter(s => s.configured).length;
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
    newsAPIUsage: getNewsAPIUsage()
  };
}