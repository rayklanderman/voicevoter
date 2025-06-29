import { useState, useEffect } from 'react';
import { supabase, Question, testConnection } from '../lib/supabase';

export function useQuestion() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuestion() {
      try {
        setLoading(true);
        setError(null);

        console.log('Testing Supabase connection...');
        
        // Test connection first
        const connectionOk = await testConnection();
        if (!connectionOk) {
          throw new Error('Unable to connect to Supabase. Please check your configuration.');
        }

        console.log('Fetching latest question...');

        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Supabase error fetching question:', error);
          throw new Error(`Database error: ${error.message}`);
        }

        if (!data || data.length === 0) {
          console.log('No questions found in database');
          setQuestion(null);
        } else {
          console.log('Question fetched successfully:', data[0]);
          setQuestion(data[0]);
        }

      } catch (err) {
        let errorMessage = 'An unknown error occurred';
        
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        }
        
        console.error('Error fetching question:', err);
        setError(`Failed to load question: ${errorMessage}`);
        setQuestion(null);
      } finally {
        setLoading(false);
      }
    }

    fetchQuestion();

    // Set up real-time subscription for new questions
    const subscription = supabase
      .channel('questions')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'questions' },
        (payload) => {
          console.log('New question added:', payload);
          fetchQuestion(); // Refresh when new questions are added
        }
      )
      .subscribe((status) => {
        console.log('Questions subscription status:', status);
        if (status === 'SUBSCRIPTION_ERROR') {
          console.error('Failed to subscribe to questions channel');
        }
      });

    return () => {
      console.log('Unsubscribing from questions channel');
      subscription.unsubscribe();
    };
  }, []);

  return { question, loading, error };
}