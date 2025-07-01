/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ELEVENLABS_API_KEY: string
  readonly VITE_TOGETHER_API_KEY: string
  readonly VITE_NEWS_API_KEY: string
  readonly VITE_TWITTER_BEARER_TOKEN: string
  readonly VITE_TIKTOK_ACCESS_TOKEN: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ELEVENLABS_API_KEY: string;
  readonly VITE_TOGETHER_API_KEY: string;
  readonly VITE_NEWS_API_KEY: string;
  readonly VITE_TWITTER_BEARER_TOKEN: string;
  readonly VITE_TIKTOK_ACCESS_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
