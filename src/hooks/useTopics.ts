import { useState, useEffect } from 'react';
import { supabase, AITopic, TopicCategory } from '../lib/supabase';
import { generateTrendingTopics, isTogetherConfigured, fallbackTopics } from '../lib/together';

export function useTopics() {
  const [topics, setTopics] = useState<AITopic[]>([]);
  const [categories, setCategories] = useState<TopicCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchTopicsAndCategories();
  }, []);

  const fetchTopicsAndCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch categories first
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('topic_categories')
        .select('*')
        .order('name');

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        throw categoriesError;
      }
      setCategories(categoriesData || []);

      // Fetch active topics
      const { data: topicsData, error: topicsError } = await supabase
        .from('ai_topics')
        .select('*')
        .eq('is_active', true)
        .order('trending_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (topicsError) {
        console.error('Error fetching topics:', topicsError);
        throw topicsError;
      }
      setTopics(topicsData || []);

    } catch (err) {
      console.error('Error fetching topics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch topics');
    } finally {
      setLoading(false);
    }
  };

  const generateNewTopics = async () => {
    try {
      setGenerating(true);
      setError(null);

      let newTopics;
      
      if (isTogetherConfigured()) {
        console.log('🤖 Generating topics with Together AI...');
        newTopics = await generateTrendingTopics();
      } else {
        console.log('⚠️ Together AI not configured, using fallback topics');
        newTopics = fallbackTopics;
      }

      console.log(`Generated ${newTopics.length} topics:`, newTopics);

      // Store topics in database
      const insertedTopics = [];
      for (const topic of newTopics) {
        try {
          // Find or create category
          let categoryId = null;
          const existingCategory = categories.find(cat => 
            cat.name.toLowerCase() === topic.category.toLowerCase()
          );

          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            // Create new category if it doesn't exist
            const { data: newCategory, error: categoryError } = await supabase
              .from('topic_categories')
              .insert({
                name: topic.category,
                description: `Topics related to ${topic.category}`,
                emoji: getCategoryEmoji(topic.category)
              })
              .select()
              .single();

            if (categoryError) {
              console.error('Error creating category:', categoryError);
              // Use a default category if creation fails
              categoryId = categories[0]?.id || null;
            } else {
              categoryId = newCategory.id;
              setCategories(prev => [...prev, newCategory]);
            }
          }

          const { data: insertedTopic, error: insertError } = await supabase
            .from('ai_topics')
            .insert({
              title: topic.title,
              description: topic.description,
              category_id: categoryId,
              trending_score: topic.trending_score,
              keywords: topic.keywords,
              source: isTogetherConfigured() ? 'together_ai' : 'fallback',
              is_active: true
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting topic:', insertError);
          } else {
            insertedTopics.push(insertedTopic);
            console.log(`✅ Stored topic: ${insertedTopic.title.substring(0, 50)}...`);
          }
        } catch (topicError) {
          console.error('Error processing individual topic:', topicError);
        }
      }

      // Refresh topics to show new ones
      await fetchTopicsAndCategories();
      
      console.log(`✅ Successfully generated and stored ${insertedTopics.length} new topics`);

    } catch (err) {
      console.error('Error generating topics:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate topics');
    } finally {
      setGenerating(false);
    }
  };

  const createQuestionFromTopic = async (topicId: string) => {
    try {
      const topic = topics.find(t => t.id === topicId);
      if (!topic) throw new Error('Topic not found');

      const { data, error } = await supabase
        .from('questions')
        .insert({
          text: topic.title,
          topic_id: topicId,
          source: 'ai_generated',
          is_trending: true,
          moderation_status: 'approved'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating question:', error);
        throw error;
      }

      console.log('✅ Created question from topic:', data);
      return { data, error: null };

    } catch (err) {
      console.error('Error creating question from topic:', err);
      return { data: null, error: err instanceof Error ? err.message : 'Failed to create question' };
    }
  };

  return {
    topics,
    categories,
    loading,
    error,
    generating,
    generateNewTopics,
    createQuestionFromTopic,
    refresh: fetchTopicsAndCategories
  };
}

// Helper function to get emoji for category
function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    'Technology': '💻',
    'Politics': '🏛️',
    'Environment': '🌍',
    'Health': '🏥',
    'Entertainment': '🎬',
    'Sports': '⚽',
    'Economy': '💰',
    'Science': '🔬',
    'Social Issues': '👥',
    'Lifestyle': '🌟',
    'News': '📰',
    'Culture': '🎨'
  };
  
  return emojiMap[category] || '📊';
}