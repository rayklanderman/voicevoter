import React, { useState } from 'react';
import { Volume2, VolumeX, Loader2, CheckCircle, XCircle, Settings, Headphones, AlertTriangle } from 'lucide-react';
import { playTextWithFallback, getAudioServiceStatus, isElevenLabsConfigured } from '../lib/elevenLabs';

export default function VoiceTestPanel() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; service: string; message: string } | null>(null);
  const audioService = getAudioServiceStatus();

  const testVoiceFeature = async () => {
    setTesting(true);
    setTestResult(null);

    const testText = "Welcome to Voice Voter! This is a test of our premium text-to-speech system. Your voice experience is now optimized for the best audio quality.";

    try {
      const result = await playTextWithFallback(testText);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        service: 'None',
        message: `Voice synthesis failed: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">🎙️ Voice Experience</h3>
            <p className="text-sm text-slate-400">
              {audioService.service} • Premium audio quality
            </p>
          </div>
        </div>
        
        <button
          onClick={testVoiceFeature}
          disabled={testing || !audioService.available}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-600/50 disabled:to-pink-600/50 text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {testing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Testing Audio...</span>
            </>
          ) : (
            <>
              <Volume2 className="w-5 h-5" />
              <span>Test Voice Quality</span>
            </>
          )}
        </button>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className={`p-4 rounded-xl border ${
          isElevenLabsConfigured() 
            ? 'bg-green-500/10 border-green-500/20 text-green-300' 
            : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isElevenLabsConfigured() ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <Settings className="w-5 h-5" />
            )}
            <h4 className="font-bold">ElevenLabs Premium Voice</h4>
          </div>
          <p className="text-sm">
            {isElevenLabsConfigured() 
              ? '✅ Premium AI voice synthesis configured - testing connection...'
              : '🔧 Ready to upgrade - add API key for premium voices'
            }
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${
          audioService.available
            ? 'bg-green-500/10 border-green-500/20 text-green-300'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {audioService.available ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <h4 className="font-bold">Browser Audio Support</h4>
          </div>
          <p className="text-sm">
            {audioService.available 
              ? '✅ Built-in browser TTS available as reliable backup'
              : '❌ Browser audio not supported'
            }
          </p>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`p-4 rounded-xl border ${
          testResult.success 
            ? testResult.service === 'ElevenLabs'
              ? 'bg-green-500/10 border-green-500/20 text-green-300'
              : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {testResult.success ? (
              testResult.service === 'ElevenLabs' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <h4 className="font-bold">
              Audio Test: {testResult.service}
            </h4>
          </div>
          <p className="text-sm">{testResult.message}</p>
          
          {/* Additional help for ElevenLabs issues */}
          {testResult.service === 'Browser TTS' && testResult.message.includes('ElevenLabs') && (
            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h5 className="font-bold text-blue-300 mb-1">💡 ElevenLabs Troubleshooting</h5>
              <ul className="text-xs text-blue-400 space-y-1 list-disc list-inside">
                <li>Check your ElevenLabs account status at elevenlabs.io</li>
                <li>Verify your API key is valid and active</li>
                <li>Free tier may be disabled - consider upgrading to a paid plan</li>
                <li>If using VPN/proxy, try disabling it or upgrade to paid plan</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Premium Features Info */}
      {isElevenLabsConfigured() && (
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
          <h4 className="font-bold text-purple-300 mb-2">🎉 Premium Voice Features Configured</h4>
          <ul className="text-sm text-purple-400 space-y-1 list-disc list-inside">
            <li>High-quality AI voice synthesis with natural intonation</li>
            <li>Optimized speech pacing for poll results</li>
            <li>Enhanced audio clarity and professional delivery</li>
            <li>Automatic fallback to browser TTS if needed</li>
          </ul>
          <p className="text-xs text-purple-500 mt-2">
            Note: Test the voice feature above to verify your ElevenLabs account status
          </p>
        </div>
      )}
    </div>
  );
}