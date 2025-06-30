import React, { useState } from 'react';
import { X, Plus, Sparkles, Loader2, CheckCircle, AlertCircle, Lightbulb, Zap } from 'lucide-react';
import { generateTrendingTopics, isTogetherConfigured } from '../lib/together';
import { supabase } from '../lib/supabase';

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserTopic {
  title: string;
  description: string;
  category: string;
  keywords: string[];
}

const CreateTopicModal: React.FC<CreateTopicModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual creation state
  const [manualTopic, setManualTopic] = useState<UserTopic>({
    title: '',
    description: '',
    category: 'General',
    keywords: []
  });
  const [keywordInput, setKeywordInput] = useState('');

  // AI generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTopics, setAiTopics] = useState<UserTopic[]>([]);

  const categories = [
    'Technology', 'Politics', 'Environment', 'Health', 'Entertainment',
    'Sports', 'Economy', 'Science', 'Social Issues', 'Lifestyle', 'General'
  ];

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTopic.title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Convert to question format
      let questionText = manualTopic.title;
      if (!questionText.toLowerCase().startsWith('should') && !questionText.endsWith('?')) {
        questionText = `Should ${questionText.toLowerCase()}?`;
      }
      if (!questionText.endsWith('?')) {
        questionText += '?';
      }

      // Create trending topic
      const { error: insertError } = await supabase
        .from('trending_topics')
        .insert({
          source: 'user_created',
          raw_topic: manualTopic.title,
          summary: manualTopic.description || manualTopic.title,
          question_text: questionText,
          context: manualTopic.description || `User-submitted topic: ${manualTopic.title}`,
          category: manualTopic.category,
          keywords: manualTopic.keywords,
          trending_score: 75, // Default score for user topics
          is_safe: true,
          is_active: true,
          vote_count: 0
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess('Topic created successfully! It will appear in the trending leaderboard.');
      
      // Reset form
      setManualTopic({
        title: '',
        description: '',
        category: 'General',
        keywords: []
      });
      setKeywordInput('');

      // Broadcast update
      window.dispatchEvent(new CustomEvent('trendingTopicsUpdated', {
        detail: { trigger: 'user_created', count: 1, timestamp: new Date().toISOString() }
      }));

    } catch (err) {
      console.error('Error creating topic:', err);
      setError(err instanceof Error ? err.message : 'Failed to create topic');
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setLoading(true);
    setError(null);
    setAiTopics([]);

    try {
      if (!isTogetherConfigured()) {
        throw new Error('Together AI is not configured. Please add your API key to use AI generation.');
      }

      // Generate topics using Together AI with custom prompt
      const response = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
          messages: [{
            role: 'user',
            content: `Generate 3-5 engaging poll questions based on this topic or theme: "${aiPrompt}"

Requirements:
- Each question should be answerable with YES or NO
- Make them thought-provoking and debate-worthy
- Suitable for a global audience
- Avoid controversial or harmful content

Format as JSON:
[
  {
    "title": "Should [clear yes/no question]?",
    "description": "Brief explanation of why this is relevant and interesting",
    "category": "Technology|Politics|Environment|Health|Entertainment|Sports|Economy|Science|Social Issues|Lifestyle",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4"]
  }
]

Only return the JSON array, no other text.`
          }],
          max_tokens: 2000,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI generation failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from AI');
      }

      const cleanContent = content.trim().replace(/```json\n?|\n?```/g, '');
      const topics = JSON.parse(cleanContent);

      if (!Array.isArray(topics) || topics.length === 0) {
        throw new Error('Invalid response format from AI');
      }

      setAiTopics(topics);
      setSuccess(`Generated ${topics.length} topic suggestions!`);

    } catch (err) {
      console.error('Error generating AI topics:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate topics');
    } finally {
      setLoading(false);
    }
  };

  const handleAITopicSubmit = async (topic: UserTopic) => {
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('trending_topics')
        .insert({
          source: 'ai_generated',
          raw_topic: topic.title,
          summary: topic.description,
          question_text: topic.title,
          context: topic.description,
          category: topic.category,
          keywords: topic.keywords,
          trending_score: 80, // Slightly higher score for AI topics
          is_safe: true,
          is_active: true,
          vote_count: 0
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess('AI-generated topic added to trending leaderboard!');
      
      // Remove from AI topics list
      setAiTopics(prev => prev.filter(t => t.title !== topic.title));

      // Broadcast update
      window.dispatchEvent(new CustomEvent('trendingTopicsUpdated', {
        detail: { trigger: 'ai_generated', count: 1, timestamp: new Date().toISOString() }
      }));

    } catch (err) {
      console.error('Error adding AI topic:', err);
      setError(err instanceof Error ? err.message : 'Failed to add topic');
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !manualTopic.keywords.includes(keywordInput.trim())) {
      setManualTopic(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setManualTopic(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-purple-200/50">
        {/* Header */}
        <div className="p-6 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-blue-600 bg-clip-text text-transparent">
                  ✨ Create Your Own Topic
                </h2>
                <p className="text-purple-600 font-medium">
                  Add topics manually or generate them with AI
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-purple-100 rounded-full transition-colors text-purple-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'manual'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              Manual Creation
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'ai'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI Generation
              {!isTogetherConfigured() && <span className="text-xs">(Setup Required)</span>}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Status Messages */}
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 text-green-700 p-4 rounded-xl text-sm border border-green-200 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Success!</p>
                <p>{success}</p>
              </div>
            </div>
          )}

          {/* Manual Creation Tab */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-purple-900 mb-3">
                  Topic Title / Question
                </label>
                <input
                  type="text"
                  value={manualTopic.title}
                  onChange={(e) => setManualTopic(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-purple-900 placeholder-purple-400"
                  placeholder="e.g., Should remote work become the global standard?"
                  required
                />
                <p className="text-xs text-purple-600 mt-2">
                  💡 Tip: Frame as a yes/no question for better engagement
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-purple-900 mb-3">
                  Description (Optional)
                </label>
                <textarea
                  value={manualTopic.description}
                  onChange={(e) => setManualTopic(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-purple-900 placeholder-purple-400 h-24 resize-none"
                  placeholder="Provide context about why this topic is relevant and interesting..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-purple-900 mb-3">
                  Category
                </label>
                <select
                  value={manualTopic.category}
                  onChange={(e) => setManualTopic(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-purple-900"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-purple-900 mb-3">
                  Keywords (Optional)
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    className="flex-1 px-4 py-2 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-purple-900 placeholder-purple-400"
                    placeholder="Add a keyword..."
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {manualTopic.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                    >
                      #{keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(keyword)}
                        className="text-purple-500 hover:text-purple-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !manualTopic.title.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-600/50 disabled:to-blue-600/50 text-white py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating Topic...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Create Topic</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* AI Generation Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {!isTogetherConfigured() && (
                <div className="bg-yellow-50 text-yellow-700 p-4 rounded-xl text-sm border border-yellow-200">
                  <p className="font-semibold mb-2">⚠️ Together AI Not Configured</p>
                  <p>To use AI generation, please add your Together AI API key to the environment variables.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-blue-900 mb-3">
                  Describe the topic or theme you want to explore
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-blue-900 placeholder-blue-400 h-24 resize-none"
                  placeholder="e.g., The future of artificial intelligence in healthcare, climate change solutions, social media impact on society..."
                  disabled={!isTogetherConfigured()}
                />
                <p className="text-xs text-blue-600 mt-2">
                  🤖 AI will generate multiple poll questions based on your description
                </p>
              </div>

              <button
                onClick={handleAIGenerate}
                disabled={loading || !aiPrompt.trim() || !isTogetherConfigured()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-600/50 disabled:to-purple-600/50 text-white py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating Topics...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Generate with AI</span>
                  </>
                )}
              </button>

              {/* AI Generated Topics */}
              {aiTopics.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-900">Generated Topic Suggestions:</h3>
                  {aiTopics.map((topic, index) => (
                    <div
                      key={index}
                      className="bg-blue-50 border border-blue-200 rounded-xl p-4"
                    >
                      <h4 className="font-bold text-blue-900 mb-2">{topic.title}</h4>
                      <p className="text-blue-700 text-sm mb-3">{topic.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold">
                            {topic.category}
                          </span>
                          <div className="flex gap-1">
                            {topic.keywords.slice(0, 3).map((keyword, i) => (
                              <span key={i} className="text-xs text-blue-600">#{keyword}</span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAITopicSubmit(topic)}
                          disabled={loading}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add to Leaderboard
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTopicModal;