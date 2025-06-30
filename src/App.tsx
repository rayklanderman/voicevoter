import React, { useState } from 'react';
import { Vote, LogOut, User, TrendingUp, Menu, X, Shield } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useQuestion } from './hooks/useQuestion';
import AuthModal from './components/AuthModal';
import VotingCard from './components/VotingCard';
import TopicSelector from './components/TopicSelector';
import TrendingDashboard from './components/TrendingDashboard';
import DatabaseHealthCheck from './components/DatabaseHealthCheck';
import { isTogetherConfigured } from './lib/together';
import { isElevenLabsConfigured } from './lib/elevenLabs';

function App() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [topicSelectorOpen, setTopicSelectorOpen] = useState(false);
  const [trendingDashboardOpen, setTrendingDashboardOpen] = useState(false);
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();
  const { question, loading: questionLoading, error } = useQuestion();

  const handleSignOut = async () => {
    await signOut();
  };

  // Check if we have premium features
  const hasPremiumFeatures = isTogetherConfigured() || isElevenLabsConfigured();

  if (authLoading || questionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-600 border-t-blue-500 mx-auto mb-6"></div>
          </div>
          <p className="text-slate-300 font-semibold text-lg">Loading Voice Voter...</p>
          <p className="text-slate-400 text-sm mt-2">Preparing your voting experience</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 max-w-md mx-auto text-center">
          <div className="text-red-400 mb-6">
            <Vote className="w-20 h-20 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Connection Issue</h2>
          <p className="text-slate-300 mb-4">Unable to connect to the database</p>
          <p className="text-sm text-slate-400 mb-6">
            Please check your internet connection and try again.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => setShowSystemStatus(!showSystemStatus)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto"
            >
              <Shield className="w-5 h-5" />
              System Diagnostics
            </button>
          )}
          {showSystemStatus && (
            <div className="mt-6">
              <DatabaseHealthCheck />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl">
                <Vote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Voice Voter</h1>
                <p className="text-xs text-slate-400 hidden sm:block">
                  {hasPremiumFeatures ? '🎙️ Premium Voting Platform' : '🗳️ Democratic Voting Platform'}
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={() => setTrendingDashboardOpen(true)}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Trending</span>
              </button>

              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-2 rounded-lg border border-slate-600/50">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-slate-300 hidden lg:inline">
                      {user.email?.split('@')[0] || 'User'}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden lg:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-300 hover:text-white p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-700/50">
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setTrendingDashboardOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Trending Topics</span>
                </button>

                {user ? (
                  <div className="pt-2 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 px-3 py-2 text-slate-300">
                      <User className="w-4 h-4" />
                      <span className="text-sm">{user.email?.split('@')[0] || 'User'}</span>
                    </div>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAuthModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Status Panel - Only in development */}
        {showSystemStatus && process.env.NODE_ENV === 'development' && (
          <div className="mb-8">
            <DatabaseHealthCheck />
          </div>
        )}

        {/* Voting Section */}
        <section>
          {question ? (
            <VotingCard
              questionId={question.id}
              questionText={question.text}
              questionSource={question.source}
              createdAt={question.created_at}
              onAuthRequired={() => setAuthModalOpen(true)}
              isAuthenticated={!!user}
            />
          ) : (
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-12 text-center">
              <div className="text-6xl mb-6">🤔</div>
              <h2 className="text-2xl font-bold text-white mb-4">No Active Questions</h2>
              <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
                No questions are currently available for voting. Check out the trending topics to see what's capturing global attention.
              </p>
              <button
                onClick={() => setTrendingDashboardOpen(true)}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-3 mx-auto"
              >
                <TrendingUp className="w-6 h-6" />
                <span>View Trending Topics</span>
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-3 bg-slate-800/50 backdrop-blur-xl px-6 py-4 rounded-xl border border-slate-700/50">
            <span className="text-slate-300">Built with</span>
            <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Bolt.new</span>
            {hasPremiumFeatures && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-300">Premium Features Active</span>
                <span className="text-xl">✨</span>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
      
      {topicSelectorOpen && (
        <TopicSelector
          onTopicSelect={() => {}}
          onClose={() => setTopicSelectorOpen(false)}
        />
      )}

      {trendingDashboardOpen && (
        <TrendingDashboard
          onClose={() => setTrendingDashboardOpen(false)}
        />
      )}
    </div>
  );
}

export default App;