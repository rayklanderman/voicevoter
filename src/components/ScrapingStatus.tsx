import React, { useState, useEffect } from 'react';
import { Globe, CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle, Settings, Zap } from 'lucide-react';
import { getConfiguredAPIs, getScrapingStatus } from '../lib/socialScraper';
import { getScrapingStats } from '../lib/trendingSystem';
import { isTogetherConfigured } from '../lib/together';
import { isElevenLabsConfigured } from '../lib/elevenLabs';

function ScrapingStatus() {
  const [apis, setApis] = useState<{ name: string; configured: boolean }[]>([]);
  const [stats, setStats] = useState<{
    totalSources: number;
    configuredSources: number;
    lastScrapedTimes: Record<string, string>;
  }>({ totalSources: 0, configuredSources: 0, lastScrapedTimes: {} });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const configuredAPIs = getConfiguredAPIs();
    const scrapingStats = getScrapingStats();
    
    setApis(configuredAPIs);
    setStats(scrapingStats);
  }, []);

  const refresh = () => {
    const configuredAPIs = getConfiguredAPIs();
    const scrapingStats = getScrapingStats();
    
    setApis(configuredAPIs);
    setStats(scrapingStats);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">🌍 Real-Time Social Media Scraping</h3>
            <p className="text-sm text-slate-400">
              {stats.configuredSources}/{stats.totalSources} sources configured • Real X trends from trends24.in
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
          
          <button
            onClick={refresh}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* API Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {apis.map((api) => (
          <div
            key={api.name}
            className={`flex items-center gap-2 p-3 rounded-lg ${
              api.configured 
                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
            }`}
          >
            {api.configured ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{api.name}</span>
          </div>
        ))}
      </div>

      {/* Enhanced API Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* ElevenLabs Status */}
        <div className={`p-4 rounded-xl border ${
          isElevenLabsConfigured() 
            ? 'bg-green-500/10 border-green-500/20 text-green-300' 
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isElevenLabsConfigured() ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <Settings className="w-5 h-5" />
            )}
            <h4 className="font-bold">🎙️ ElevenLabs Voice</h4>
          </div>
          <p className="text-sm">
            {isElevenLabsConfigured() 
              ? '✅ Premium AI voice synthesis active'
              : '⚠️ Using browser TTS fallback'
            }
          </p>
        </div>

        {/* Together AI Status */}
        <div className={`p-4 rounded-xl border ${
          isTogetherConfigured() 
            ? 'bg-green-500/10 border-green-500/20 text-green-300' 
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isTogetherConfigured() ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <h4 className="font-bold">🤖 Together AI</h4>
          </div>
          <p className="text-sm">
            {isTogetherConfigured() 
              ? '✅ AI topic generation active'
              : '❌ Using fallback topics'
            }
          </p>
        </div>

        {/* X Trends Status */}
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5" />
            <h4 className="font-bold">🐦 X Trends (trends24.in)</h4>
          </div>
          <p className="text-sm">
            ✅ Real-time global trends scraping
          </p>
        </div>
      </div>

      {/* Configuration Status */}
      {!isTogetherConfigured() && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h4 className="font-bold text-yellow-300">⚡ Enhanced Features Available</h4>
          </div>
          <p className="text-sm text-yellow-400 mb-3">
            Your APIs are configured! You now have access to:
          </p>
          <ul className="text-xs text-yellow-400 space-y-1 list-disc list-inside">
            <li>🎙️ Premium ElevenLabs voice synthesis</li>
            <li>🤖 Advanced Together AI topic generation</li>
            <li>🌍 Real-time X trends from trends24.in</li>
            <li>📊 Enhanced content moderation and safety</li>
          </ul>
        </div>
      )}

      {/* Detailed Status */}
      {showDetails && (
        <div className="space-y-4">
          <div className="border-t border-slate-700/50 pt-4">
            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last Scraping Activity
            </h4>
            
            {Object.keys(stats.lastScrapedTimes).length === 0 ? (
              <p className="text-slate-400 text-sm">No scraping activity recorded yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(stats.lastScrapedTimes).map(([source, time]) => (
                  <div key={source} className="bg-slate-700/30 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white capitalize">
                        {source.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-400">{time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-700/50 pt-4">
            <h4 className="font-bold text-white mb-3">🚀 Real Scraping Capabilities</h4>
            <div className="space-y-3 text-sm">
              <div className="bg-slate-700/30 rounded-lg p-3">
                <h5 className="font-bold text-blue-300 mb-2">🐦 X (Twitter) - trends24.in</h5>
                <p className="text-slate-300 mb-2">Real-time global trending topics</p>
                <p className="text-xs text-slate-400">
                  ✅ No API key required • Global coverage • Real-time updates<br/>
                  Scrapes from trends24.in with multiple fallback methods
                </p>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-3">
                <h5 className="font-bold text-red-300 mb-2">🤖 Reddit</h5>
                <p className="text-slate-300 mb-2">Hot posts from r/all</p>
                <p className="text-xs text-slate-400">
                  ✅ No API key required • Public endpoints • High engagement posts
                </p>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-3">
                <h5 className="font-bold text-orange-300 mb-2">📰 News API</h5>
                <p className="text-slate-300 mb-2">Breaking news headlines</p>
                <p className="text-xs text-slate-400">
                  {apis.find(api => api.name === 'News API')?.configured 
                    ? '✅ Configured and active'
                    : '⚠️ Add VITE_NEWS_API_KEY for real news scraping'
                  }
                </p>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-3">
                <h5 className="font-bold text-pink-300 mb-2">🎵 TikTok Research API</h5>
                <p className="text-slate-300 mb-2">Trending hashtags and content</p>
                <p className="text-xs text-slate-400">
                  {apis.find(api => api.name === 'TikTok')?.configured 
                    ? '✅ Configured and active'
                    : '⚠️ Requires TikTok Research API approval'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScrapingStatus;