#!/bin/bash
# Netlify Deployment Script for VoiceVoter

echo "🚀 VoiceVoter Netlify Deployment Helper"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📦 Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Check build size
BUILD_SIZE=$(du -sh dist | cut -f1)
echo "📊 Build size: $BUILD_SIZE"

echo ""
echo "🌐 Ready for deployment!"
echo ""
echo "Choose your deployment method:"
echo "1. 🔗 Deploy via GitHub (recommended)"
echo "2. 📤 Deploy directly (drag & drop alternative)"
echo "3. 🖥️ Deploy via Netlify CLI"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📋 GitHub Deployment Steps:"
        echo "1. Commit your changes: git add . && git commit -m 'Ready for deployment'"
        echo "2. Push to GitHub: git push origin main"
        echo "3. Go to netlify.com and connect your GitHub repository"
        echo "4. Add environment variables in Netlify dashboard"
        echo ""
        echo "📋 Environment Variables to add in Netlify:"
        echo "VITE_SUPABASE_URL"
        echo "VITE_SUPABASE_ANON_KEY"
        echo "VITE_ELEVENLABS_API_KEY"
        echo "VITE_TOGETHER_API_KEY"
        ;;
    2)
        echo ""
        echo "📤 Manual Deployment:"
        echo "1. Go to netlify.com/drop"
        echo "2. Drag the 'dist' folder to deploy"
        echo "3. Configure environment variables in site settings"
        echo ""
        echo "Opening dist folder..."
        if command -v explorer &> /dev/null; then
            explorer dist
        elif command -v open &> /dev/null; then
            open dist
        else
            echo "📁 Dist folder location: $(pwd)/dist"
        fi
        ;;
    3)
        echo ""
        echo "🖥️ CLI Deployment:"
        echo "Logging into Netlify..."
        netlify login
        
        echo "Deploying to Netlify..."
        netlify deploy --prod --dir=dist
        
        echo "✅ Deployment complete!"
        echo "⚠️  Don't forget to add environment variables in your Netlify dashboard!"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 VoiceVoter is ready for production!"
echo "📚 See NETLIFY_DEPLOYMENT.md for detailed instructions"
