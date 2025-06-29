import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallback error handling
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && 
  supabaseUrl !== 'your_supabase_url' && 
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey && 
  supabaseAnonKey !== 'your_supabase_anon_key';

// Create a mock client for development when Supabase isn't configured
const createMockClient = () => ({
  from: () => ({
    select: () => Promise.resolve({ data: [], error: new Error('Supabase not configured') }),
    insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    upsert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
  }),
  auth: {
    signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    signOut: () => Promise.resolve({ error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  channel: () => ({
    on: () => ({
      subscribe: () => ({
        unsubscribe: () => {}
      })
    }),
    subscribe: () => ({
      unsubscribe: () => {}
    })
  })
});

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : createMockClient() as any;

export type Question = {
  id: string;
  text: string;
  topic_id?: string;
  source?: string;
  is_trending?: boolean;
  metadata?: any;
  moderation_status?: string;
  trending_score?: number;
  created_at: string;
};

export type Vote = {
  id: string;
  question_id: string;
  user_id: string | null;
  session_id?: string | null;
  choice: 'yes' | 'no';
  is_anonymous?: boolean;
  created_at: string;
};

export type VoteCount = {
  yes: number;
  no: number;
  total: number;
};

export type TopicCategory = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  created_at: string;
};

export type AITopic = {
  id: string;
  title: string;
  description: string;
  category_id: string;
  trending_score: number;
  source: string;
  keywords: string[];
  generated_at: string;
  is_active: boolean;
  created_at: string;
};

// Test Supabase connection
export async function testConnection(): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.warn('⚠️ Supabase not configured. Please set up your environment variables.');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('questions')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (err) {
    console.error('Database connection error:', err);
    return false;
  }
}

// Generate a session ID for anonymous users
export function generateSessionId(): string {
  return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get or create session ID for anonymous voting
export function getSessionId(): string {
  const storageKey = 'voice_voter_session';
  let sessionId = localStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
}

// Database health check function
export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean;
  tables: Record<string, boolean>;
  errors: string[];
}> {
  if (!isSupabaseConfigured) {
    return {
      isHealthy: false,
      tables: {},
      errors: ['Supabase not configured. Please set up your environment variables.']
    };
  }

  const tables = [
    'questions',
    'votes', 
    'trending_topics',
    'trend_votes',
    'crowned_trends',
    'topic_categories',
    'ai_topics'
  ];
  
  const result = {
    isHealthy: true,
    tables: {} as Record<string, boolean>,
    errors: [] as string[]
  };

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        result.tables[table] = false;
        result.errors.push(`${table}: Connection failed`);
        result.isHealthy = false;
      } else {
        result.tables[table] = true;
      }
    } catch (err) {
      result.tables[table] = false;
      result.errors.push(`${table}: System error`);
      result.isHealthy = false;
    }
  }

  return result;
}

// Export configuration status for components to check
export const isConfigured = isSupabaseConfigured;