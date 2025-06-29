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

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('topic_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch active topics
      const { data: topicsData, error: topicsError } = await supabase
        .from('ai_topics')
        .select('*')
        .eq('is_active', true)
        .order('trending_score', { ascending: false });

      if (topicsError) throw topicsError;
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

      // Store topics in database
      for (const topic of newTopics) {
        // Find category ID
        const category = categories.find(cat => 
          cat.name.toLowerCase() === topic.category.toLowerCase()
        );

        if (category) {
          const { error: insertError } = await supabase
            .from('ai_topics')
            .insert({
              title: topic.title,
              description: topic.description,
              category_id: category.id,
              trending_score: topic.trending_score,
              keywords: topic.keywords,
              source: isTogetherConfigured() ? 'together_ai' : 'fallback',
              is_active: true
            });

          if (insertError) {
            console.error('Error inserting topic:', insertError);
          }
        }
      }

      // Refresh topics
      await fetchTopicsAndCategories();
      
      console.log(`✅ Generated and stored ${newTopics.length} new topics`);

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
          is_trending: true
        })
        .select()
        .single();

      if (error) throw error;

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