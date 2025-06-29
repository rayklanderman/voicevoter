import { generateTrendingTopics, isTogetherConfigured } from './together';
import { supabase } from './supabase';

export interface TrendingSource {
  name: string;
  emoji: string;
  description: string;
}

export const TRENDING_SOURCES: Record<string, TrendingSource> = {
  'x_twitter': {
    name: 'X (Twitter)',
    emoji: '🐦',
    description: 'Trending topics from X/Twitter'
  },
  'facebook': {
    name: 'Facebook',
    emoji: '📘',
    description: 'Popular discussions from Facebook'
  },
  'reddit': {
    name: 'Reddit',
    emoji: '🤖',
    description: 'Hot topics from Reddit communities'
  },
  'news': {
    name: 'News',
    emoji: '📰',
    description: 'Breaking news and current events'
  },
  'tech': {
    name: 'Tech',
    emoji: '💻',
    description: 'Technology and innovation trends'
  }
};

export interface ProcessedTopic {
  originalTopic: string;
  question: string;
  source: string;
  category: string;
  context: string;
  keywords: string[];
  trending_score: number;
  is_safe: boolean;
  reasoning: string;
}

// Convert trending topics into yes/no poll questions
export async function convertTopicsToQuestions(topics: string[], source: string): Promise<ProcessedTopic[]> {
  if (!isTogetherConfigured()) {
    throw new Error('Together AI not configured');
  }

  const prompt = `You are an expert at converting trending topics into engaging yes/no poll questions for a global voting app.

Convert these trending topics into poll questions:
${topics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}

For each topic, create:
1. A clear, engaging yes/no question
2. Brief context explaining why it's trending
3. Category classification
4. Safety assessment
5. Keywords for searchability
6. Trending score (1-100)

Requirements:
- Questions must be answerable with YES or NO
- Avoid offensive, harmful, or overly political content
- Make questions globally relevant and engaging
- Keep questions concise but clear
- Focus on topics that generate healthy debate

Categories: Technology, Politics, Environment, Health, Entertainment, Sports, Economy, Science, Social Issues, Lifestyle, News, Culture

Format as JSON array:
[
  {
    "originalTopic": "Original trending topic text",
    "question": "Should [clear yes/no question]?",
    "source": "${source}",
    "category": "Category name",
    "context": "Brief explanation of why this is trending",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "trending_score": 85,
    "is_safe": true,
    "reasoning": "Why this question is appropriate/inappropriate"
  }
]

Only return valid JSON, no other text.`;

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000,
        temperature: 0.7,
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
    
    // Filter for safe topics only
    return processedTopics.filter((topic: ProcessedTopic) => topic.is_safe);

  } catch (error) {
    console.error('Error converting topics to questions:', error);
    throw error;
  }
}

// Simulate fetching trending topics from various sources
export async function fetchTrendingTopics(source: string, limit: number = 10): Promise<string[]> {
  // In a real implementation, these would be actual API calls to social media platforms
  const mockTrendingTopics: Record<string, string[]> = {
    'x_twitter': [
      'Elon Musk announces new X banking features',
      'AI chatbots replacing customer service worldwide',
      'Remote work productivity studies show mixed results',
      'Electric vehicle sales surpass gas cars in Europe',
      'Social media age verification laws proposed globally',
      'Cryptocurrency market volatility reaches new highs',
      'Climate change protests spread across major cities',
      'Space tourism becomes accessible to middle class',
      'Virtual reality education programs launch in schools',
      'Gene therapy breakthrough treats rare diseases'
    ],
    'facebook': [
      'Meta launches new VR social spaces',
      'Privacy concerns over facial recognition technology',
      'Small businesses struggle with digital transformation',
      'Mental health apps gain popularity among teens',
      'Sustainable fashion brands challenge fast fashion',
      'Home automation systems become mainstream',
      'Online learning platforms replace traditional education',
      'Food delivery apps impact local restaurant industry',
      'Digital nomad lifestyle becomes permanent for many',
      'Renewable energy costs drop below fossil fuels'
    ],
    'reddit': [
      'GameStop stock phenomenon returns with new momentum',
      'Artificial intelligence writes bestselling novels',
      'Universal basic income trials show promising results',
      'Quantum computing breakthrough threatens encryption',
      'Lab-grown meat receives regulatory approval',
      'Social credit systems expand beyond China',
      'Autonomous vehicles cause insurance industry upheaval',
      'Blockchain voting systems tested in local elections',
      'Brain-computer interfaces help paralyzed patients',
      'Vertical farming revolutionizes urban agriculture'
    ],
    'news': [
      'Global inflation rates stabilize after years of volatility',
      'Breakthrough malaria vaccine shows 95% effectiveness',
      'International space station prepares for decommission',
      'Ocean cleanup technology removes plastic successfully',
      'Nuclear fusion reactor achieves net energy gain',
      'Digital currencies challenge traditional banking',
      'Artificial organs grown from stem cells save lives',
      'Solar panel efficiency reaches record 50% conversion',
      'Autonomous ships begin commercial cargo operations',
      'Gene editing eliminates hereditary diseases'
    ],
    'tech': [
      'Quantum internet prototype connects major cities',
      'AI discovers new antibiotics to fight superbugs',
      'Holographic displays replace traditional screens',
      'Neural implants restore sight to blind patients',
      'Robotic surgeons perform complex operations remotely',
      '6G networks promise instant global connectivity',
      'Digital twins optimize city infrastructure planning',
      'Synthetic biology creates custom organisms',
      'Edge computing brings AI processing to devices',
      'Molecular storage systems replace data centers'
    ]
  };

  const topics = mockTrendingTopics[source] || mockTrendingTopics['news'];
  return topics.slice(0, limit);
}

// Auto-generate daily questions from trending topics
export async function generateDailyQuestions(): Promise<void> {
  try {
    console.log('🔄 Starting daily question generation...');

    // Fetch trending topics from multiple sources
    const sources = ['x_twitter', 'facebook', 'reddit', 'news', 'tech'];
    const allProcessedTopics: ProcessedTopic[] = [];

    for (const source of sources.slice(0, 2)) { // Limit to 2 sources to avoid rate limits
      try {
        console.log(`📡 Fetching trending topics from ${TRENDING_SOURCES[source].name}...`);
        const topics = await fetchTrendingTopics(source, 5);
        
        console.log(`🤖 Converting ${topics.length} topics to questions...`);
        const processedTopics = await convertTopicsToQuestions(topics, source);
        
        allProcessedTopics.push(...processedTopics);
        
        // Add delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error processing ${source}:`, error);
        continue; // Continue with other sources
      }
    }

    if (allProcessedTopics.length === 0) {
      console.log('⚠️ No topics processed, using fallback questions');
      return;
    }

    // Sort by trending score and take top questions
    const topQuestions = allProcessedTopics
      .sort((a, b) => b.trending_score - a.trending_score)
      .slice(0, 3); // Generate 3 questions per day

    console.log(`✅ Generated ${topQuestions.length} high-quality questions`);

    // Store questions in database
    for (const topic of topQuestions) {
      try {
        const { error } = await supabase
          .from('questions')
          .insert({
            text: topic.question,
            source: `trending_${topic.source}`,
            is_trending: true,
            // Store additional metadata in a JSON field if available
          });

        if (error) {
          console.error('Error inserting question:', error);
        } else {
          console.log(`📝 Stored question: ${topic.question.substring(0, 50)}...`);
        }
      } catch (insertError) {
        console.error('Error inserting question:', insertError);
      }
    }

    console.log('🎉 Daily question generation completed!');

  } catch (error) {
    console.error('Error in generateDailyQuestions:', error);
    throw error;
  }
}

// Content moderation helper
export function moderateContent(text: string): { isAppropriate: boolean; reason?: string } {
  const inappropriateKeywords = [
    'hate', 'violence', 'explicit', 'nsfw', 'offensive',
    'discriminatory', 'harassment', 'abuse', 'illegal'
  ];

  const lowerText = text.toLowerCase();
  
  for (const keyword of inappropriateKeywords) {
    if (lowerText.includes(keyword)) {
      return {
        isAppropriate: false,
        reason: `Contains inappropriate content: ${keyword}`
      };
    }
  }

  return { isAppropriate: true };
}

// Get trending context for voice output
export function getTrendingContext(question: string, source: string): string {
  const sourceInfo = TRENDING_SOURCES[source.replace('trending_', '')] || TRENDING_SOURCES['news'];
  
  return `Here's what's trending on ${sourceInfo.name}: ${question}`;
}