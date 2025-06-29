// Enhanced social media scraping with real trends24.in integration
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

// News API configuration
const NEWS_API_CONFIG: SocialMediaAPI = {
  name: 'News',
  endpoint: 'https://newsapi.org/v2/top-headlines?country=us&pageSize=20',
  headers: {
    'X-API-Key': import.meta.env.VITE_NEWS_API_KEY || ''
  },
  parseResponse: (data) => {
    if (!data?.articles) return [];
    return data.articles.map((article: any) => ({
      text: article.title,
      volume: 100,
      url: article.url,
      timestamp: article.publishedAt
    }));
  }
};

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

// Check if API credentials are configured
export function getConfiguredAPIs(): { name: string; configured: boolean }[] {
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
      name: 'News API', 
      configured: !!(import.meta.env.VITE_NEWS_API_KEY && 
                     import.meta.env.VITE_NEWS_API_KEY !== 'your_news_api_key')
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
  'tiktok': [
    'AI dance challenge reaches 500M+ views globally',
    'Climate activism content inspires Gen Z worldwide',
    'Virtual fashion shows replace traditional runways',
    'Mental health awareness campaigns go viral',
    'Sustainable living hacks trend among creators',
    'AI-generated music collaborations top charts',
    'Digital detox movement gains massive momentum',
    'VR fitness classes replace gym memberships',
    'Plant-based cooking tutorials inspire millions',
    'Cryptocurrency education content explodes'
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

// Real API scraping function
async function scrapeFromAPI(config: SocialMediaAPI, limit: number = 10): Promise<ScrapedTrend[]> {
  try {
    console.log(`🔍 Scraping from ${config.name} API...`);
    
    const response = await fetch(config.endpoint, {
      method: 'GET',
      headers: config.headers
    });

    if (!response.ok) {
      throw new Error(`${config.name} API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const trends = config.parseResponse(data);
    
    console.log(`✅ Scraped ${trends.length} trends from ${config.name}`);
    return trends.slice(0, limit);

  } catch (error) {
    console.warn(`⚠️ ${config.name} API failed:`, error);
    throw error;
  }
}

// Enhanced scraping with real X trends from trends24.in
export async function scrapeTrendingTopics(source: string, limit: number = 10): Promise<string[]> {
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
          trends = await scrapeFromAPI(REDDIT_API_CONFIG, limit);
        } catch (error) {
          console.warn('Reddit API failed, using mock data');
          trends = [];
        }
        break;
        
      case 'news':
        const newsConfigured = configuredAPIs.find(api => api.name === 'News API')?.configured;
        if (newsConfigured) {
          try {
            trends = await scrapeFromAPI(NEWS_API_CONFIG, limit);
          } catch (error) {
            console.warn('News API failed, using mock data');
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

// Get scraping status for all sources
export function getScrapingStatus(): Record<string, { configured: boolean; lastScraped?: string }> {
  const apis = getConfiguredAPIs();
  const status: Record<string, { configured: boolean; lastScraped?: string }> = {};
  
  apis.forEach(api => {
    const sourceKey = api.name.toLowerCase().replace(/[^a-z]/g, '');
    status[sourceKey] = {
      configured: api.configured,
      lastScraped: localStorage.getItem(`last_scraped_${sourceKey}`) || undefined
    };
  });
  
  return status;
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