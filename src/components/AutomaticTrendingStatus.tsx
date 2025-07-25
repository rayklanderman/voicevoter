import React, { useState, useEffect } from 'react';
import { Clock, Zap, Globe, RefreshCw, AlertCircle, CheckCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { automaticTrendingSystem, getNewsAPIStatus } from '../lib/automaticTrendingSystem';
import { getNewsAPIUsage } from '../lib/socialScraper';

interface TrendingUpdate {
  lastUpdate: string;
  nextUpdate: string;
  isUpdating: boolean;
  breakingNewsDetected: boolean;
}

export default function AutomaticTrendingStatus() {
  const [status, setStatus] = useState<TrendingUpdate>(automaticTrendingSystem.getSystemStatus());
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');
  const [recentUpdate, setRecentUpdate] = useState<{ trigger: string; count: number; timestamp: string } | null>(null);
  const [newsAPIStatus, setNewsAPIStatus] = useState(getNewsAPIStatus());

  useEffect(() => {
    // Update status every 30 seconds
    const statusInterval = setInterval(() => {
      setStatus(automaticTrendingSystem.getSystemStatus());
      setTimeUntilNext(automaticTrendingSystem.getTimeUntilNextUpdate());
      setNewsAPIStatus(getNewsAPIStatus());
    }, 30000);

    // Listen for trending topics updates
    const handleTrendingUpdate = (event: CustomEvent) => {
      setRecentUpdate(event.detail);
      setStatus(automaticTrendingSystem.getSystemStatus());
      
      // Clear recent update after 30 seconds
      setTimeout(() => setRecentUpdate(null), 30000);
    };

    window.addEventListener('trendingTopicsUpdated', handleTrendingUpdate as EventListener);

    // Initial update
    setTimeUntilNext(automaticTrendingSystem.getTimeUntilNextUpdate());

    return () => {
      clearInterval(statusInterval);
      window.removeEventListener('trendingTopicsUpdated', handleTrendingUpdate as EventListener);
    };
  }, []);

  const getStatusColor = () => {
    if (status.isUpdating) return 'from-blue-500 to-blue-600';
    if (status.breakingNewsDetected) return 'from-red-500 to-red-600';
    return 'from-green-500 to-green-600';
  };

  const getStatusIcon = () => {
    if (status.isUpdating) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (status.breakingNewsDetected) return <AlertCircle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (status.isUpdating) return 'Updating trending topics...';
    if (status.breakingNewsDetected) return 'Breaking news detected!';
    return 'System operational';
  };

  const formatLastUpdate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getNewsAPIColor = () => {
    const { usage } = newsAPIStatus;
    const percentUsed = (usage.used / usage.total) * 100;
    
    if (percentUsed > 80) return 'text-red-400';
    if (percentUsed > 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-r ${getStatusColor()} rounded-xl flex items-center justify-center`}>
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">🌍 Automatic Trending System</h3>
            <p className="text-sm text-slate-400">
              Real-time global trend monitoring • Updates every 3 hours • NewsAPI integrated
            </p>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 bg-gradient-to-r ${getStatusColor()} text-white px-3 py-2 rounded-lg`}>
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
      </div>

      {/* Recent Update Notification */}
      {recentUpdate && (
        <div className="mb-4 bg-blue-500/10 text-blue-300 p-3 rounded-lg text-sm border border-blue-500/20 flex items-center gap-3">
          <Zap className="w-4 h-4" />
          <div>
            <p className="font-semibold">
              {recentUpdate.trigger === 'breaking_news' ? '🚨 Breaking News Update!' : '✅ Trending Topics Updated'}
            </p>
            <p>
              {recentUpdate.count} new topics added • {formatLastUpdate(recentUpdate.timestamp)}
            </p>
          </div>
        </div>
      )}

      {/* NewsAPI Usage Status */}
      <div className="mb-4 bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <h4 className="font-bold text-slate-300">📰 NewsAPI Usage</h4>
          </div>
          <span className={`text-sm font-bold ${getNewsAPIColor()}`}>
            {newsAPIStatus.usage.used}/{newsAPIStatus.usage.total} requests
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Strategy: {newsAPIStatus.strategy}</span>
          <span>{newsAPIStatus.usage.remaining} remaining today</span>
        </div>
        
        {/* Usage Progress Bar */}
        <div className="mt-2 w-full bg-slate-600/30 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              (newsAPIStatus.usage.used / newsAPIStatus.usage.total) > 0.8 
                ? 'bg-red-500' 
                : (newsAPIStatus.usage.used / newsAPIStatus.usage.total) > 0.6 
                ? 'bg-yellow-500' 
                : 'bg-green-500'
            }`}
            style={{ 
              width: `${Math.min(100, (newsAPIStatus.usage.used / newsAPIStatus.usage.total) * 100)}%` 
            }}
          ></div>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Last Update */}
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h4 className="font-bold text-slate-300">Last Update</h4>
          </div>
          <p className="text-sm text-white">
            {formatLastUpdate(status.lastUpdate)}
          </p>
        </div>

        {/* Next Update */}
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h4 className="font-bold text-slate-300">Next Update</h4>
          </div>
          <p className="text-sm text-white">
            {status.isUpdating ? 'Updating now...' : `In ${timeUntilNext}`}
          </p>
        </div>

        {/* System Features */}
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-slate-400" />
            <h4 className="font-bold text-slate-300">Features</h4>
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <p>✅ Auto-updates every 3 hours</p>
            <p>✅ Breaking news detection</p>
            <p>✅ NewsAPI integration (500/day)</p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h4 className="font-bold text-blue-300 mb-2">🤖 How Automatic Updates Work</h4>
        <div className="text-xs text-blue-400 space-y-1">
          <p>• <strong>Scheduled Updates:</strong> Every 3 hours, scrapes X, Reddit, and NewsAPI</p>
          <p>• <strong>Breaking News:</strong> Monitors NewsAPI every 15 minutes for urgent updates</p>
          <p>• <strong>Smart Quota Management:</strong> Optimizes NewsAPI usage (500 requests/day)</p>
          <p>• <strong>Global Sources:</strong> Real trends from trends24.in, Reddit, and news sources</p>
        </div>
      </div>
    </div>
  );
}