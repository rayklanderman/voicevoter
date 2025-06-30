// Enhanced social media scraping with NewsAPI.org integration
import { scrapeTrends24, getGlobalTrends, scrapeXTrendsAlternative } from './trends24Scraper';

interface ScrapedTrend {
  text: string;
  volume: number;
  url?: string;
  timestamp: string;
}

interface SocialMediaAPI {
  name: string;
  endpoint: string;
  headers: Record<string, string>;
  parseResponse: (data: any) => ScrapedTrend[];
}

// NewsAPI.org configuration - 500 requests per day
const NEWS_API_CONFIG: SocialMediaAPI = {
  name: 'NewsAPI',
  endpoint: 'https://newsapi.org/v2/top-headlines',
  headers: {
    'X-API-Key': import.meta.env.VITE_NEWS_API_KEY || ''
  },
  parseResponse: (data) => {
    if (!data?.articles) return [];
    return data.articles
      .filter((article: any) => article.title && article.title.length > 10)
      .map((article: any) => ({
        text: article.title,
        volume: calculateNewsVolume(article),
        url: article.url,
        timestamp: article.publishedAt
      }));
  }
};

// Calculate news volume based on source popularity and recency
function calculateNewsVolume(article: any): number {
  const baseVolume = 1000;
  const sourceMultipliers: Record<string, number> = {
    'bbc': 3.0,
    'cnn': 2.8,
    'reuters': 2.5,
    'associated press': 2.5,
    'the guardian': 2.2,
    'new york times': 2.0,
    'washington post': 2.0,
    'bloomberg': 1.8,
    'techcrunch': 1.5,
    'default': 1.0
  };

  const sourceName = article.source?.name?.toLowerCase() || 'default';
  const sourceMultiplier = Object.entries(sourceMultipliers)
    .find(([key]) => sourceName.includes(key))?.[1] || sourceMultipliers.default;

  // Boost recent articles
  const publishedAt = new Date(article.publishedAt);
  const hoursAgo = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
  const recencyMultiplier = Math.max(0.5, 2 - (hoursAgo / 12)); // Decay over 24 hours

  return Math.floor(baseVolume * sourceMultiplier * recencyMultiplier);
}

// Reddit API configuration (no auth needed for public endpoints)
const REDDIT_API_CONFIG: SocialMediaAPI = {
  name: 'Reddit',
  endpoint: 'https://www.reddit.com/r/all/hot.json?limit=25',
  headers: {
    'User-Agent': 'VoiceVoter/1.0'
  },
  parseResponse: (data) => {
    if (!data?.data?.children) return [];
    return data.data.children
      .filter((post: any) => post.data.ups > 1000)
      .map((post: any) => ({
        text: post.data.title,
        volume: post.data.ups,
        url: `https://reddit.com${post.data.permalink}`,
        timestamp: new Date(post.data.created_utc * 1000).toISOString()
      }));
  }
};

// NewsAPI rate limiting and optimization
class NewsAPIManager {
  private static instance: NewsAPIManager;
  private requestCount: number = 0;
  private lastResetDate: string = '';
  private readonly MAX_DAILY_REQUESTS = 500;
  private readonly STORAGE_KEY = 'newsapi_usage';

  static getInstance(): NewsAPIManager {
    if (!NewsAPIManager.instance) {
      NewsAPIManager.instance = new NewsAPIManager();
    }
    return NewsAPIManager.instance;
  }

  constructor() {
    this.loadUsageData();
  }

  private loadUsageData() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const today = new Date().toDateString();
        
        if (data.date === today) {
          this.requestCount = data.count || 0;
          this.lastResetDate = data.date;
        } else {
          // New day, reset counter
          this.requestCount = 0;
          this.lastResetDate = today;
          this.saveUsageData();
        }
      } catch (error) {
        console.warn('Error loading NewsAPI usage data:', error);
        this.resetUsage();
      }
    } else {
      this.resetUsage();
    }
  }

  private saveUsageData() {
    const data = {
      count: this.requestCount,
      date: this.lastResetDate
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  private resetUsage() {
    this.requestCount = 0;
    this.lastResetDate = new Date().toDateString();
    this.saveUsageData();
  }

  canMakeRequest(): boolean {
    return this.requestCount < this.MAX_DAILY_REQUESTS;
  }

  getRemainingRequests(): number {
    return Math.max(0, this.MAX_DAILY_REQUESTS - this.requestCount);
  }

  getUsageStats(): { used: number; remaining: number; total: number; resetTime: string } {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return {
      used: this.requestCount,
      remaining: this.getRemainingRequests(),
      total: this.MAX_DAILY_REQUESTS,
      resetTime: tomorrow.toLocaleString()
    };
  }

  incrementUsage() {
    this.requestCount++;
    this.saveUsageData();
    console.log(`📰 NewsAPI usage: ${this.requestCount}/${this.MAX_DAILY_REQUESTS} requests today`);
  }

  // Smart request strategy based on time and remaining quota
  shouldMakeRequest(priority: 'high' | 'medium' | 'low' = 'medium'): boolean {
    if (!this.canMakeRequest()) return false;

    const remaining = this.getRemainingRequests();
    const hour = new Date().getHours();
    
    // High priority: breaking news, manual refresh
    if (priority === 'high') return remaining > 10;
    
    // Medium priority: scheduled updates
    if (priority === 'medium') {
      // Peak hours (6 AM - 10 PM): use more requests
      const isPeakHours = hour >= 6 && hour <= 22;
      return isPeakHours ? remaining > 50 : remaining > 20;
    }
    
    // Low priority: background updates
    return remaining > 100;
  }
}

// Check if API credentials are configured
export function getConfiguredAPIs(): { name: string; configured: boolean; usage?: any }[] {
  const newsManager = NewsAPIManager.getInstance();
  
  return [
    { 
      name: 'X (Twitter)', 
      configured: true // Always true since we use trends24.in
    },
    { 
      name: 'TikTok', 
      configured: !!(import.meta.env.VITE_TIKTOK_ACCESS_TOKEN && 
                     import.meta.env.VITE_TIKTOK_ACCESS_TOKEN !== 'your_tiktok_access_token')
    },
    { 
      name: 'Reddit', 
      configured: true // Reddit doesn't require API key for public endpoints
    },
    { 
      name: 'NewsAPI', 
      configured: !!(import.meta.env.VITE_NEWS_API_KEY && 
                     import.meta.env.VITE_NEWS_API_KEY !== 'your_news_api_key'),
      usage: newsManager.getUsageStats()
    }
  ];
}

// Enhanced mock data with more realistic trending topics
const ENHANCED_MOCK_DATA: Record<string, string[]> = {
  'x_twitter': [
    'AI breakthrough in quantum computing announced by Google',
    'Tesla unveils new $25,000 fully autonomous vehicle',
    'Meta launches revolutionary VR workspace platform',
    'OpenAI GPT-5 shows unprecedented reasoning capabilities',
    'SpaceX successfully lands crew on Mars surface',
    'Apple introduces brain-computer interface technology',
    'Microsoft integrates advanced AI into Windows 12',
    'Amazon announces same-day drone delivery globally',
    'Netflix creates AI-generated personalized content',
    'TikTok launches educational AI tutoring system'
  ],
  'reddit': [
    'Universal Basic Income pilot shows 90% poverty reduction',
    'Scientists discover breakthrough Alzheimer\'s treatment',
    'Fusion energy achieves net positive output milestone',
    'Lab-grown organs save thousands of lives annually',
    'Ocean cleanup removes 80% of Pacific plastic',
    'Vertical farming feeds entire cities sustainably',
    'Gene therapy eliminates hereditary diseases',
    'Quantum internet connects global institutions',
    'AI solves protein folding for disease research',
    'Space elevator construction begins in Ecuador'
  ],
  'news': [
    'Global carbon emissions drop 50% due to green tech',
    'Malaria vaccine shows 99% effectiveness in trials',
    'International space station prepares Mars mission',
    'Renewable energy costs drop below fossil fuels',
    'AI early warning prevents natural disasters',
    'Gene editing approved for human enhancement',
    'Autonomous vehicles reduce accidents by 95%',
    'Digital currencies replace traditional banking',
    'Robotic surgeons perform remote operations',
    'Brain implants restore sight to blind patients'
  ]
};

// Real API scraping function with NewsAPI optimization
async function scrapeFromAPI(config: SocialMediaAPI, limit: number = 10, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<ScrapedTrend[]> {
  try {
    console.log(`🔍 Scraping from ${config.name} API...`);
    
    // Special handling for NewsAPI
    if (config.name === 'NewsAPI') {
      const newsManager = NewsAPIManager.getInstance();
      
      if (!newsManager.shouldMakeRequest(priority)) {
        const stats = newsManager.getUsageStats();
        console.log(`⚠️ NewsAPI request skipped. Usage: ${stats.used}/${stats.total}, Priority: ${priority}`);
        throw new Error(`NewsAPI quota management: ${stats.remaining} requests remaining`);
      }
    }

    // Build endpoint URL with parameters
    let endpoint = config.endpoint;
    if (config.name === 'NewsAPI') {
      const params = new URLSearchParams({
        country: 'us',
        pageSize: Math.min(limit * 2, 50).toString(), // Get more to filter better
        sortBy: 'popularity'
      });
      endpoint = `${endpoint}?${params}`;
    }
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: config.headers
    });

    if (!response.ok) {
      throw new Error(`${config.name} API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Increment NewsAPI usage counter
    if (config.name === 'NewsAPI') {
      NewsAPIManager.getInstance().incrementUsage();
    }
    
    const trends = config.parseResponse(data);
    
    console.log(`✅ Scraped ${trends.length} trends from ${config.name}`);
    return trends.slice(0, limit);

  } catch (error) {
    console.warn(`⚠️ ${config.name} API failed:`, error);
    throw error;
  }
}

// Enhanced scraping with intelligent NewsAPI usage
export async function scrapeTrendingTopics(source: string, limit: number = 10, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<string[]> {
  const configuredAPIs = getConfiguredAPIs();
  
  try {
    let trends: ScrapedTrend[] = [];

    switch (source) {
      case 'x_twitter':
        console.log('🐦 Scraping real X trends from trends24.in...');
        try {
          // Try multiple scraping methods for X trends
          trends = await getGlobalTrends();
          
          if (trends.length === 0) {
            trends = await scrapeXTrendsAlternative();
          }
          
          if (trends.length === 0) {
            trends = await scrapeTrends24('worldwide');
          }
          
        } catch (error) {
          console.warn('All X scraping methods failed, using enhanced mock data');
          trends = [];
        }
        break;
        
      case 'reddit':
        try {
          trends = await scrapeFromAPI(REDDIT_API_CONFIG, limit, priority);
        } catch (error) {
          console.warn('Reddit API failed, using mock data');
          trends = [];
        }
        break;
        
      case 'news':
        const newsConfigured = configuredAPIs.find(api => api.name === 'NewsAPI')?.configured;
        if (newsConfigured) {
          try {
            trends = await scrapeFromAPI(NEWS_API_CONFIG, limit, priority);
          } catch (error) {
            console.warn('NewsAPI failed or quota managed:', error);
            trends = [];
          }
        }
        break;
    }

    // If real scraping succeeded, return results
    if (trends.length > 0) {
      console.log(`✅ Successfully scraped ${trends.length} real trends from ${source}`);
      
      // Store last scraped time
      localStorage.setItem(`last_scraped_${source}`, new Date().toISOString());
      
      return trends.map(trend => trend.text).slice(0, limit);
    }
  } catch (error) {
    console.warn(`Real scraping failed for ${source}:`, error);
  }

  // Fallback to enhanced mock data
  console.log(`📝 Using enhanced mock data for ${source}`);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
  
  const mockTopics = ENHANCED_MOCK_DATA[source] || ENHANCED_MOCK_DATA['news'];
  
  // Randomize and return fresh topics each time
  const shuffled = [...mockTopics].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

// Get scraping status for all sources including NewsAPI usage
export function getScrapingStatus(): Record<string, { configured: boolean; lastScraped?: string; usage?: any }> {
  const apis = getConfiguredAPIs();
  const status: Record<string, { configured: boolean; lastScraped?: string; usage?: any }> = {};
  
  apis.forEach(api => {
    const sourceKey = api.name.toLowerCase().replace(/[^a-z]/g, '');
    status[sourceKey] = {
      configured: api.configured,
      lastScraped: localStorage.getItem(`last_scraped_${sourceKey}`) || undefined,
      usage: api.usage
    };
  });
  
  return status;
}

// Get NewsAPI usage statistics
export function getNewsAPIUsage() {
  return NewsAPIManager.getInstance().getUsageStats();
}

// Smart scraping strategy that optimizes NewsAPI usage
export async function smartScrapingStrategy(sources: string[], totalLimit: number = 20): Promise<Record<string, string[]>> {
  const results: Record<string, string[]> = {};
  const newsManager = NewsAPIManager.getInstance();
  const currentHour = new Date().getHours();
  
  // Determine priority based on time and usage
  const isPeakHours = currentHour >= 6 && currentHour <= 22;
  const isBreakingNewsTime = currentHour >= 8 && currentHour <= 20; // Business hours
  
  for (const source of sources) {
    let priority: 'high' | 'medium' | 'low' = 'medium';
    let limit = Math.floor(totalLimit / sources.length);
    
    // Adjust priority and limits based on source and conditions
    if (source === 'news') {
      priority = isBreakingNewsTime ? 'high' : 'medium';
      limit = isPeakHours ? Math.min(15, limit) : Math.min(10, limit);
    } else if (source === 'x_twitter') {
      priority = 'high'; // X trends are always high priority
      limit = Math.min(12, limit);
    } else {
      priority = 'low';
      limit = Math.min(8, limit);
    }
    
    try {
      const topics = await scrapeTrendingTopics(source, limit, priority);
      results[source] = topics;
      
      // Add delay between sources to be respectful
      if (source !== sources[sources.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (error) {
      console.error(`Error scraping ${source}:`, error);
      results[source] = [];
    }
  }
  
  // Log usage summary
  if (sources.includes('news')) {
    const usage = newsManager.getUsageStats();
    console.log(`📊 NewsAPI Daily Usage: ${usage.used}/${usage.total} (${usage.remaining} remaining)`);
  }
  
  return results;
}

// Rate limiting helper
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  canMakeRequest(source: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const requests = this.requests.get(source) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(source, validRequests);
    return true;
  }
}

export const rateLimiter = new RateLimiter();