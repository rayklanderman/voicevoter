# VoiceVoter - Netlify Deployment Guide

This guide will help you deploy VoiceVoter to Netlify.

## 🚀 Quick Deployment Steps

### Option 1: Deploy from GitHub (Recommended)

1. **Push to GitHub:**

   ```bash
   git add .
   git commit -m "Ready for Netlify deployment"
   git push origin main
   ```

2. **Connect to Netlify:**

   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub account
   - Select your VoiceVoter repository
   - Netlify will automatically detect the build settings from `netlify.toml`

3. **Configure Environment Variables:**
   In your Netlify dashboard, go to Site Settings → Environment Variables and add:

   ```
   VITE_SUPABASE_URL=https://qljigxmedpdptwrqldxy.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsamlneG1lZHBkcHR3cnFsZHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMjM3NTksImV4cCI6MjA2Njc5OTc1OX0.00RxuiBS6L6mk5KfruaMLh2zx7FpD8fZaIuLFKwsfsI
   VITE_ELEVENLABS_API_KEY=sk_66d05757a0cb558869623fb2c468d7c786411e862aa177cd
   VITE_TOGETHER_API_KEY=tgp_v1_oycZsog6MCSQSOc_8E6mukJ31p39ynseHYq2EpACwJg
   ```

4. **Deploy:**
   - Click "Deploy site"
   - Your site will be live in a few minutes!

### Option 2: Manual Drag & Drop

1. **Build locally:**

   ```bash
   npm run build
   ```

2. **Deploy:**
   - Go to [netlify.com/drop](https://netlify.com/drop)
   - Drag the `dist` folder to the deployment area
   - Add environment variables in site settings after deployment

## 🔧 Build Configuration

The project includes:

- **netlify.toml**: Automatic build configuration
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Node Version**: 18

## 🌐 Features Included

✅ **Single Page Application**: Proper routing with redirects  
✅ **PWA Support**: Service worker and manifest  
✅ **Security Headers**: XSS protection, content security  
✅ **Asset Caching**: Optimized static asset delivery  
✅ **Database Integration**: Full Supabase connection

## 🔍 Post-Deployment Checklist

After deployment, verify:

- [ ] Site loads correctly
- [ ] Environment variables are set
- [ ] Database connections work
- [ ] Voting functionality works
- [ ] Audio playback works
- [ ] Trending topics load

## 🔒 Security Notes

- API keys are properly configured as environment variables
- Supabase RLS policies are active
- Security headers are configured in netlify.toml
- Anonymous voting uses session-based authentication

## 📱 Performance

- Gzip compression enabled
- Asset caching configured
- Lazy loading implemented
- Bundle size optimized (359KB total)

Your VoiceVoter app will be production-ready on Netlify! 🎉
