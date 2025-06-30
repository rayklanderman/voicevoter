const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
// Using Rachel voice - clear, professional female voice optimized for announcements
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === 'your_elevenlabs_api_key') {
    throw new Error('ElevenLabs API key not configured');
  }

  // Optimize text for speech synthesis and limit length for free tier
  const optimizedText = optimizeTextForSpeech(text);
  
  // Limit text length to conserve free tier tokens (max 2500 chars to be safe)
  const limitedText = optimizedText.length > 2500 
    ? optimizedText.substring(0, 2500) + '...' 
    : optimizedText;

  console.log(`🎙️ ElevenLabs: Synthesizing ${limitedText.length} characters with Rachel voice`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: limitedText,
      model_id: 'eleven_turbo_v2_5', // Latest high-quality model
      voice_settings: {
        stability: 0.7,        // Higher stability for clearer speech
        similarity_boost: 0.8, // Higher similarity for consistent voice
        style: 0.3,           // Moderate style for engaging delivery
        use_speaker_boost: true
      },
      output_format: 'mp3_44100_128' // High quality audio format
    }),
  });

  if (!response.ok) {
    let errorMessage = `ElevenLabs API error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail?.message) {
        errorMessage = errorData.detail.message;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
      
      // Handle specific error cases
      if (response.status === 401) {
        errorMessage = 'ElevenLabs API key is invalid or expired';
      } else if (response.status === 429) {
        errorMessage = 'ElevenLabs rate limit exceeded. Please try again later.';
      } else if (response.status === 402) {
        errorMessage = 'ElevenLabs quota exceeded. You may have used your free 10,000 characters.';
      }
    } catch (parseError) {
      // If we can't parse the error response, use the status text
      errorMessage = `ElevenLabs API error: ${response.status} ${response.statusText}`;
    }
    
    console.error('ElevenLabs API error:', response.status, errorMessage);
    throw new Error(errorMessage);
  }

  console.log('✅ ElevenLabs: Audio synthesis successful');
  return response.arrayBuffer();
}

export async function playText(text: string): Promise<void> {
  try {
    console.log('🎤 Starting ElevenLabs Turbo v2.5 synthesis...');
    
    const audioBuffer = await synthesizeSpeech(text);
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    const audio = new Audio(audioUrl);
    audio.volume = 0.9; // Optimal volume for clear speech
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        console.log('✅ ElevenLabs audio playback completed');
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = (e) => {
        console.error('❌ Audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
        reject(new Error('Failed to play ElevenLabs audio'));
      };
      
      audio.onloadstart = () => {
        console.log('⏳ Loading ElevenLabs audio...');
      };
      
      audio.oncanplay = () => {
        console.log('🔊 ElevenLabs audio ready to play');
      };
      
      // Attempt to play the audio
      audio.play().catch((playError) => {
        console.error('❌ Audio play error:', playError);
        URL.revokeObjectURL(audioUrl);
        reject(new Error(`Failed to play ElevenLabs audio: ${playError.message}`));
      });
    });
  } catch (error) {
    console.error('❌ Error in ElevenLabs playText:', error);
    throw error;
  }
}

// Enhanced browser TTS fallback with better voice selection
export function speakWithBrowserTTS(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Text-to-speech not supported in this browser'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const optimizedText = optimizeTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(optimizedText);
    
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google') || 
      voice.name.includes('Microsoft') ||
      (voice.lang.startsWith('en') && voice.name.includes('Female'))
    ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 0.9;     // Slightly slower for clarity
    utterance.pitch = 1.0;    // Natural pitch
    utterance.volume = 0.8;   // Good volume level
    
    utterance.onstart = () => {
      console.log('🔊 Browser TTS started');
    };
    
    utterance.onend = () => {
      console.log('✅ Browser TTS completed');
      resolve();
    };
    
    utterance.onerror = (e) => {
      console.error('❌ Browser TTS error:', e.error);
      reject(new Error(`Speech synthesis error: ${e.error}`));
    };
    
    window.speechSynthesis.speak(utterance);
  });
}

// Optimize text for better speech synthesis
function optimizeTextForSpeech(text: string): string {
  return text
    // Add pauses after punctuation for better pacing
    .replace(/\./g, '. ')
    .replace(/,/g, ', ')
    .replace(/!/g, '! ')
    .replace(/\?/g, '? ')
    // Convert numbers to words for better pronunciation
    .replace(/(\d+)%/g, '$1 percent')
    // Add emphasis to key words
    .replace(/\byes\b/gi, 'YES')
    .replace(/\bno\b/gi, 'NO')
    // Improve pronunciation of common terms
    .replace(/\bAI\b/g, 'Artificial Intelligence')
    .replace(/\bAPI\b/g, 'A P I')
    .replace(/\bURL\b/g, 'U R L')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if ElevenLabs is properly configured
export function isElevenLabsConfigured(): boolean {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  return !!(apiKey && apiKey !== 'your_elevenlabs_api_key' && apiKey.startsWith('sk_'));
}

// Get audio service status for user feedback
export function getAudioServiceStatus(): { service: string; available: boolean; message: string } {
  if (isElevenLabsConfigured()) {
    return {
      service: 'ElevenLabs Turbo v2.5',
      available: true,
      message: 'Premium AI voice synthesis with Rachel voice (10,000 free characters)'
    };
  } else if ('speechSynthesis' in window) {
    return {
      service: 'Browser TTS',
      available: true,
      message: 'Using browser built-in text-to-speech'
    };
  } else {
    return {
      service: 'None',
      available: false,
      message: 'No text-to-speech available'
    };
  }
}

// Enhanced function that tries ElevenLabs first, then falls back to browser TTS
export async function playTextWithFallback(text: string): Promise<{ service: string; success: boolean; message: string }> {
  if (isElevenLabsConfigured()) {
    try {
      console.log('🎙️ Attempting ElevenLabs synthesis...');
      await playText(text);
      return {
        service: 'ElevenLabs',
        success: true,
        message: 'Premium AI voice synthesis completed successfully with Turbo v2.5 model'
      };
    } catch (elevenLabsError) {
      console.warn('ElevenLabs failed, falling back to browser TTS:', elevenLabsError);
      
      // Check if it's an API key/account issue
      const errorMessage = elevenLabsError instanceof Error ? elevenLabsError.message : String(elevenLabsError);
      const isAccountIssue = errorMessage.includes('401') || 
                            errorMessage.includes('invalid') || 
                            errorMessage.includes('expired') ||
                            errorMessage.includes('quota exceeded') ||
                            errorMessage.includes('402');
      
      try {
        console.log('🔄 Falling back to browser TTS...');
        await speakWithBrowserTTS(text);
        return {
          service: 'Browser TTS',
          success: true,
          message: isAccountIssue 
            ? 'ElevenLabs quota/auth issue detected. Using browser TTS as backup. Check your API key or usage limits.'
            : 'ElevenLabs temporarily unavailable. Using browser TTS as backup.'
        };
      } catch (browserError) {
        return {
          service: 'None',
          success: false,
          message: `Both ElevenLabs and browser TTS failed. ElevenLabs: ${errorMessage}. Browser: ${browserError instanceof Error ? browserError.message : String(browserError)}`
        };
      }
    }
  } else {
    try {
      console.log('🔊 Using browser TTS (ElevenLabs not configured)...');
      await speakWithBrowserTTS(text);
      return {
        service: 'Browser TTS',
        success: true,
        message: 'Browser text-to-speech completed successfully. Add ElevenLabs API key for premium voice quality.'
      };
    } catch (browserError) {
      return {
        service: 'None',
        success: false,
        message: `Browser TTS failed: ${browserError instanceof Error ? browserError.message : String(browserError)}`
      };
    }
  }
}