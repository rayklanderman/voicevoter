const TOGETHER_API_KEY = import.meta.env.VITE_TOGETHER_API_KEY;
const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';

// Using Llama 3.1 405B for highest quality topic generation
const MODEL = 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo';

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

  // Validate API key format
  if (!TOGETHER_API_KEY.startsWith('tgp_')) {
    throw new Error('Invalid Together AI API key format');
  }

  const prompt = `You are a trending topics analyst with expertise in global social media trends. Generate 8 current trending topics that would make excellent poll questions for a global voting app.

Requirements:
- Topics should be current, relevant, and engaging for 2025
- Mix of categories: Technology, Politics, Environment, Health, Entertainment, Sports, Economy, Science, Social Issues, Lifestyle
- Each topic should be polarizing enough to generate interesting yes/no votes
- Avoid overly sensitive or harmful topics
- Focus on topics people globally would have strong opinions about
- Make questions thought-provoking and debate-worthy

For each topic, provide:
1. A clear, engaging title (as a question that can be answered YES/NO)
2. Brief description explaining current relevance and why it's trending
3. Category from the list above
4. 4-6 relevant keywords for searchability
5. Trending score (70-100 based on current global relevance)

Format your response as valid JSON array with this exact structure:
[
  {
    "title": "Should AI companies be required to pay royalties to content creators whose work was used for training?",
    "description": "Growing global debate over AI training data compensation as creators and publishers demand fair payment for their intellectual property being used to train large language models",
    "category": "Technology",
    "keywords": ["AI", "copyright", "creators", "royalties", "training data", "intellectual property"],
    "trending_score": 92
  }
]

Focus on topics that are:
- Currently trending in 2025
- Globally relevant across cultures
- Generating real debate and discussion
- Suitable for yes/no voting format
- Engaging for diverse audiences

Only return the JSON array, no other text.`;

  try {
    console.log('🤖 Generating topics with Together AI Llama 3.1 405B...');
    
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
            role: 'system',
            content: 'You are an expert trending topics analyst. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.8,
        top_p: 0.9,
        repetition_penalty: 1.1,
      }),
    });

    if (!response.ok) {
      let errorMessage = `Together AI API error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        // Handle specific error cases
        if (response.status === 401) {
          errorMessage = 'Together AI API key is invalid or expired';
        } else if (response.status === 429) {
          errorMessage = 'Together AI rate limit exceeded. Please try again later.';
        } else if (response.status === 402) {
          errorMessage = 'Together AI quota exceeded. Please check your account balance.';
        }
      } catch (parseError) {
        errorMessage = `Together AI API error: ${response.status} ${response.statusText}`;
      }
      
      console.error('Together AI API error:', response.status, errorMessage);
      throw new Error(errorMessage);
    }

    const data: TogetherResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from Together AI');
    }

    // Clean the response to ensure it's valid JSON
    const cleanContent = content.trim().replace(/```json\n?|\n?```/g, '');

    // Parse the JSON response
    try {
      const topics = JSON.parse(cleanContent);
      
      if (!Array.isArray(topics)) {
        throw new Error('Response is not an array');
      }

      // Validate each topic has required fields
      const validTopics = topics.filter(topic => 
        topic.title && 
        topic.description && 
        topic.category && 
        Array.isArray(topic.keywords) &&
        typeof topic.trending_score === 'number' &&
        topic.trending_score >= 70 &&
        topic.trending_score <= 100
      );

      if (validTopics.length === 0) {
        throw new Error('No valid topics generated');
      }

      console.log(`✅ Generated ${validTopics.length} high-quality trending topics with Llama 3.1 405B`);
      return validTopics;

    } catch (parseError) {
      console.error('Failed to parse Together AI response:', parseError);
      console.log('Raw response:', content);
      throw new Error('Failed to parse AI response - invalid JSON format');
    }

  } catch (error) {
    console.error('Error generating trending topics:', error);
    throw error;
  }
}

export function isTogetherConfigured(): boolean {
  const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;
  return !!(apiKey && apiKey !== 'your_together_api_key' && apiKey.startsWith('tgp_'));
}

// Enhanced fallback trending topics for 2025
export const fallbackTopics: TrendingTopic[] = [
  {
    title: "Should AI-generated content be required to carry visible watermarks or labels?",
    description: "Growing concerns about AI-generated misinformation and the need for transparency in digital content",
    category: "Technology",
    keywords: ["AI", "watermarks", "transparency", "misinformation", "digital content"],
    trending_score: 95
  },
  {
    title: "Should remote work become the permanent standard for all office-compatible jobs?",
    description: "Post-pandemic workplace transformation continues as companies and employees debate the future of work",
    category: "Lifestyle",
    keywords: ["remote work", "productivity", "work-life balance", "office culture", "hybrid work"],
    trending_score: 88
  },
  {
    title: "Should electric vehicles be mandatory for all new car sales by 2030?",
    description: "Environmental policies and automotive industry transformation accelerate globally",
    category: "Environment",
    keywords: ["electric vehicles", "climate change", "automotive", "sustainability", "emissions"],
    trending_score: 85
  },
  {
    title: "Should social media platforms be held legally responsible for mental health impacts on users?",
    description: "Growing research links social media usage to mental health issues, sparking regulatory discussions",
    category: "Social Issues",
    keywords: ["social media", "mental health", "regulation", "platform responsibility", "wellbeing"],
    trending_score: 90
  },
  {
    title: "Should cryptocurrency be accepted as legal tender in all countries?",
    description: "Digital currency adoption accelerates as nations debate financial system transformation",
    category: "Economy",
    keywords: ["cryptocurrency", "legal tender", "digital currency", "finance", "blockchain"],
    trending_score: 82
  },
  {
    title: "Should gene editing be allowed for human enhancement beyond medical treatment?",
    description: "CRISPR and genetic engineering advances raise ethical questions about human enhancement",
    category: "Science",
    keywords: ["gene editing", "CRISPR", "human enhancement", "ethics", "biotechnology"],
    trending_score: 87
  },
  {
    title: "Should universal basic income be implemented globally to address AI job displacement?",
    description: "Automation and AI threaten traditional jobs, sparking debates about economic safety nets",
    category: "Economy",
    keywords: ["universal basic income", "AI displacement", "automation", "jobs", "economic policy"],
    trending_score: 91
  },
  {
    title: "Should space exploration funding be prioritized over Earth-based environmental programs?",
    description: "Debate intensifies over resource allocation between space missions and climate action",
    category: "Science",
    keywords: ["space exploration", "environmental programs", "funding priorities", "climate action"],
    trending_score: 79
  }
];