import React, { useState } from 'react';
import { Sparkles, TrendingUp, RefreshCw, Plus, Clock, Target } from 'lucide-react';
import { useTopics } from '../hooks/useTopics';
import { isTogetherConfigured } from '../lib/together';

interface TopicSelectorProps {
  onTopicSelect: (topicId: string) => void;
  onClose: () => void;
}

export default function TopicSelector({ onTopicSelect, onClose }: TopicSelectorProps) {
  const { topics, categories, loading, generating, generateNewTopics, createQuestionFromTopic } = useTopics();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [creatingQuestion, setCreatingQuestion] = useState<string | null>(null);

  const filteredTopics = selectedCategory === 'all' 
    ? topics 
    : topics.filter(topic => {
        const category = categories.find(cat => cat.id === topic.category_id);
        return category?.name.toLowerCase() === selectedCategory.toLowerCase();
      });

  const handleCreateQuestion = async (topicId: string) => {
    setCreatingQuestion(topicId);
    try {
      const { error } = await createQuestionFromTopic(topicId);
      if (!error) {
        onTopicSelect(topicId);
        onClose();
      }
    } catch (err) {
      console.error('Error creating question:', err);
    } finally {
      setCreatingQuestion(null);
    }
  };

  const getCategoryEmoji = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.emoji || '📊';
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-purple-200/50">
        {/* Header */}
        <div className="p-8 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-teal-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-teal-600 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-700 to-teal-600 bg-clip-text text-transparent">
                  AI Trending Topics 🤖
                </h2>
                <p className="text-purple-600 font-medium">
                  {isTogetherConfigured() ? 'Powered by Together AI' : 'Curated trending topics'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-purple-100 rounded-full transition-colors text-purple-600"
            >
              ✕
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={generateNewTopics}
              disabled={generating}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white px-6 py-3 rounded-full font-bold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Generating...</span>
                  <span className="text-xl animate-pulse">🤖</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate New Topics</span>
                  <span className="text-xl">✨</span>
                </>
              )}
            </button>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border-2 border-purple-200 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/80 backdrop-blur-sm font-medium text-purple-700"
            >
              <option value="all">All Categories 🌟</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.emoji} {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Topics List */}
        <div className="p-8 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gradient-to-r from-purple-100 to-teal-100 rounded-2xl p-6 animate-pulse">
                  <div className="h-6 bg-purple-200 rounded-full w-3/4 mb-3"></div>
                  <div className="h-4 bg-purple-200 rounded-full w-full mb-2"></div>
                  <div className="h-4 bg-purple-200 rounded-full w-2/3"></div>
                </div>
              ))}
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🤔</div>
              <h3 className="text-2xl font-bold text-purple-900 mb-4">No Topics Available</h3>
              <p className="text-purple-700 mb-6">
                {selectedCategory === 'all' 
                  ? 'Generate some trending topics to get started!'
                  : `No topics found in the ${selectedCategory} category.`
                }
              </p>
              <button
                onClick={generateNewTopics}
                disabled={generating}
                className="bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
              >
                Generate Topics ✨
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="bg-white/80 backdrop-blur-sm border-2 border-purple-200/50 rounded-2xl p-6 hover:border-purple-300 transition-all duration-200 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryEmoji(topic.category_id)}</span>
                      <div>
                        <span className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold">
                          <Target className="w-4 h-4" />
                          {getCategoryName(topic.category_id)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-purple-600">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-bold">{topic.trending_score}/100</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-purple-900 mb-3 leading-relaxed">
                    {topic.title}
                  </h3>

                  <p className="text-purple-700 mb-4 leading-relaxed">
                    {topic.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {topic.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="bg-gradient-to-r from-purple-100 to-teal-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        #{keyword}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-purple-600">
                      <Clock className="w-4 h-4" />
                      <span>Generated {new Date(topic.generated_at).toLocaleDateString()}</span>
                    </div>

                    <button
                      onClick={() => handleCreateQuestion(topic.id)}
                      disabled={creatingQuestion === topic.id}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white px-6 py-3 rounded-full font-bold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {creatingQuestion === topic.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Create Poll</span>
                          <span className="text-lg">🗳️</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}