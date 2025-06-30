# Voice Voter 🎙️

A modern, interactive voting platform with AI-powered voice synthesis and trending topics integration.

## 🌟 Features

### Core Functionality
- **Anonymous & Authenticated Voting** - Vote without signing up or create an account for personalized experience
- **Real-time Results** - Live vote counting with beautiful progress bars
- **Voice Synthesis** - Hear results read aloud with premium AI voices
- **Trending Topics** - AI-generated and scraped trending topics from global sources
- **Crown Daily Winners** - Daily trending topic competitions with voice announcements

### Premium Features (API Keys Required)
- **🎙️ ElevenLabs Voice Synthesis** - High-quality AI voice with Rachel voice model
- **🤖 Together AI Topic Generation** - AI-powered trending topic creation using Llama 3.1 405B
- **📰 Real-time Social Scraping** - Live trending topics from X, Reddit, and news sources

### Technical Features
- **Progressive Web App (PWA)** - Install on mobile and desktop
- **Offline Support** - Service worker for offline functionality
- **Real-time Updates** - Live vote updates and trending topic refresh
- **Responsive Design** - Beautiful UI that works on all devices
- **Database Health Monitoring** - System status and health checks

## 🚀 Deployment

### Netlify Environment Variables

Set these in your Netlify dashboard under Site Settings > Environment Variables:

```bash
# Required - Supabase Database
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Premium Features (Optional)
VITE_ELEVENLABS_API_KEY=sk_66d05757a0cb558869623fb2c468d7c786411e862aa177cd
VITE_TOGETHER_API_KEY=tgp_v1_oycZsog6MCSQSOc_8E6mukJ31p39ynseHYq2EpACwJg

# Social Media APIs (Optional)
VITE_NEWS_API_KEY=your_news_api_key
VITE_TWITTER_BEARER_TOKEN=your_twitter_bearer_token
VITE_TIKTOK_ACCESS_TOKEN=your_tiktok_access_token
```

### API Configuration Status

**✅ Configured APIs:**
- **ElevenLabs** - Premium voice synthesis (10,000 free characters)
- **Together AI** - AI topic generation with Llama 3.1 405B
- **Supabase** - Database and authentication

**🔧 Optional APIs:**
- **News API** - Real news trending topics
- **Social Media APIs** - Live social media scraping

## 🎯 Core Features That Work Without API Keys

The application is designed with robust fallback systems:

- ✅ Complete voting system (anonymous + authenticated)
- ✅ Trending topics leaderboard
- ✅ Manual topic creation
- ✅ Crown daily winners
- ✅ Browser text-to-speech (fallback)
- ✅ Enhanced realistic trending topics (mock data)
- ✅ Real-time vote updates
- ✅ PWA functionality

## 🎙️ Voice Features

### ElevenLabs Integration
- **Voice Model**: Rachel (professional female voice)
- **Quality**: Turbo v2.5 model for high-quality synthesis
- **Fallback**: Automatic fallback to browser TTS if ElevenLabs fails
- **Usage Tracking**: Character count optimization for free tier

### Audio Features
- Read voting results aloud
- Crown announcement voice scripts
- Optimized text for speech synthesis
- Cross-browser compatibility

## 🤖 AI Features

### Together AI Integration
- **Model**: Meta-Llama-3.1-405B-Instruct-Turbo
- **Purpose**: Generate engaging trending topics
- **Fallback**: Enhanced realistic mock topics
- **Quality**: High-quality, debate-worthy questions

### Automatic Trending System
- Updates every 3 hours automatically
- Breaking news detection (15-minute intervals)
- Global source scraping (X, Reddit, News)
- Smart cleanup of old topics

## 📱 PWA Features

- **Installable** - Add to home screen on mobile/desktop
- **Offline Support** - Service worker caching
- **Push Notifications** - New question alerts
- **Background Sync** - Offline vote synchronization
- **App-like Experience** - Native app feel

## 🗄️ Database Schema

### Core Tables
- `questions` - Voting questions with metadata
- `votes` - User votes with duplicate prevention
- `trending_topics` - Scraped and AI-generated topics
- `trend_votes` - Votes on trending topics
- `crowned_trends` - Daily winners with voice scripts

### Security
- Row Level Security (RLS) enabled
- Anonymous and authenticated user support
- Unique constraints prevent duplicate votes
- Safe content moderation

## 🔧 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌍 Global Features

- **Multi-source Trending** - X, Reddit, News APIs
- **Real-time Updates** - Live data refresh
- **Global Leaderboard** - Worldwide trending competition
- **Cultural Sensitivity** - Appropriate content filtering
- **Rate Limiting** - Respectful API usage

## 📊 Analytics & Monitoring

- Database health checks
- API status monitoring
- Vote count tracking
- Trending score algorithms
- System performance metrics

## 🎨 Design Philosophy

- **Apple-level Design** - Premium, polished interface
- **Micro-interactions** - Smooth animations and transitions
- **Accessibility** - WCAG compliant design
- **Mobile-first** - Responsive across all devices
- **Dark Theme** - Modern dark UI with gradients

## 🔒 Privacy & Security

- **Anonymous Voting** - No account required
- **Session Management** - Secure anonymous sessions
- **Data Protection** - GDPR compliant
- **Content Moderation** - Safe content filtering
- **API Security** - Secure key management

---

Built with ❤️ using React, TypeScript, Tailwind CSS, and Supabase.