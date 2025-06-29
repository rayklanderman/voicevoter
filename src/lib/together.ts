const TOGETHER_API_KEY = import.meta.env.VITE_TOGETHER_API_KEY;
const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';

// Using Llama 3.1 70B for high-quality topic generation
const MODEL = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';

interface TogetherResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface TrendingTopic {
  title: string;
  description: string;
  category: string;
  keywords: string[];
  trending_score: number;
}

export async function generateTrendingTopics(): Promise<TrendingTopic[]> {
  if (!TOGETHER_API_KEY || TOGETHER_API_KEY === 'your_together_api_key') {
    throw new Error('Together AI API key not configured');
  }

  const prompt = `You are a trending topics analyst. Generate 5 current trending topics that would make great poll questions for a global voting app. 

Requirements:
- Topics should be current, relevant, and engaging
- Mix of different categories (tech, politics, environment, entertainment, etc.)
- Each topic should be polarizing enough to generate interesting yes/no votes
- Avoid overly sensitive or harmful topics
- Focus on topics people globally would have opinions about

For each topic, provide:
1. A clear, engaging title (question format)
2. Brief description explaining why it's trending
3. Category from: Technology, Politics, Environment, Health, Entertainment, Sports, Economy, Science, Social Issues, Lifestyle
4. 3-5 relevant keywords
5. Trending score (1-100 based on current relevance)

Format your response as valid JSON array with this structure:
[
  {
    "title": "Should AI companies be required to pay royalties to content creators whose work was used for training?",
    "description": "Growing debate over AI training data compensation as creators demand fair payment",
    "category": "Technology",
    "keywords": ["AI", "copyright", "creators", "royalties", "training data"],
    "trending_score": 85
  }
]

Only return the JSON array, no other text.`;

  try {
    const response = await fetch(TOGETHER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Together AI API error:', response.status, errorText);
      throw new Error(`Together AI API error: ${response.status}`);
    }

    const data: TogetherResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from Together AI');
    }

    // Parse the JSON response
    try {
      const topics = JSON.parse(content);
      
      if (!Array.isArray(topics)) {
        throw new Error('Response is not an array');
      }

      // Validate each topic has required fields
      const validTopics = topics.filter(topic => 
        topic.title && 
        topic.description && 
        topic.category && 
        Array.isArray(topic.keywords) &&
        typeof topic.trending_score === 'number'
      );

      if (validTopics.length === 0) {
        throw new Error('No valid topics generated');
      }

      console.log(`✅ Generated ${validTopics.length} trending topics`);
      return validTopics;

    } catch (parseError) {
      console.error('Failed to parse Together AI response:', parseError);
      console.log('Raw response:', content);
      throw new Error('Failed to parse AI response');
    }

  } catch (error) {
    console.error('Error generating trending topics:', error);
    throw error;
  }
}

export function isTogetherConfigured(): boolean {
  return !!(TOGETHER_API_KEY && TOGETHER_API_KEY !== 'your_together_api_key');
}

// Fallback trending topics if AI is not available
export const fallbackTopics: TrendingTopic[] = [
  {
    title: "Should social media platforms be held responsible for misinformation spread on their platforms?",
    description: "Ongoing debate about platform accountability and content moderation",
    category: "Technology",
    keywords: ["social media", "misinformation", "accountability", "content moderation"],
    trending_score: 90
  },
  {
    title: "Should remote work become the permanent standard for office jobs?",
    description: "Post-pandemic workplace transformation and productivity debates",
    category: "Lifestyle",
    keywords: ["remote work", "productivity", "work-life balance", "office culture"],
    trending_score: 85
  },
  {
    title: "Should electric vehicles be mandatory by 2035?",
    description: "Environmental policies and automotive industry transformation",
    category: "Environment",
    keywords: ["electric vehicles", "climate change", "automotive", "sustainability"],
    trending_score: 80
  },
  {
    title: "Should AI-generated art be eligible for copyright protection?",
    description: "Legal and creative industry implications of AI-generated content",
    category: "Technology",
    keywords: ["AI art", "copyright", "creativity", "intellectual property"],
    trending_score: 75
  },
  {
    title: "Should cryptocurrency be accepted as legal tender globally?",
    description: "Digital currency adoption and financial system transformation",
    category: "Economy",
    keywords: ["cryptocurrency", "legal tender", "digital currency", "finance"],
    trending_score: 70
  }
];