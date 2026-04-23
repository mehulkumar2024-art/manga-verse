/**
 * Client-Side Text-to-Speech Service
 * Uses Web Speech API for browser-native voice synthesis
 * Supports character-specific voice settings
 */

/**
 * Get available voices from browser
 */
export function getAvailableVoices() {
  const voices = window.speechSynthesis.getVoices();
  return voices.map(v => ({
    id: v.voiceURI,
    name: v.name,
    language: v.lang,
    isLocalService: v.localService,
    isDefault: v.default
  }));
}

/**
 * Speak text with given settings
 */
export function speakText(text, options = {}) {
  const {
    voiceType = 'male_adult',
    characterName = 'Unknown',
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0,
    onStart = null,
    onEnd = null,
    onError = null
  } = options;

  return new Promise((resolve, reject) => {
    if (!text || text.trim().length === 0) {
      reject(new Error('Text is empty'));
      return;
    }

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);

    // Select voice based on voice type
    const voices = getAvailableVoices();
    const selectedVoice = selectVoiceForType(voices, voiceType);
    if (selectedVoice) {
      utterance.voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === selectedVoice.id);
    }

    // Set parameters
    utterance.rate = Math.max(0.5, Math.min(2.0, rate)); // 0.5 to 2.0
    utterance.pitch = Math.max(0.5, Math.min(2.0, pitch)); // 0.5 to 2.0
    utterance.volume = Math.max(0, Math.min(1, volume)); // 0 to 1
    utterance.lang = 'en-US';

    // Event handlers
    utterance.onstart = () => {
      console.log(`[TTS] Started speaking for ${characterName}: "${text.substring(0, 30)}..."`);
      if (onStart) onStart();
    };

    utterance.onend = () => {
      console.log(`[TTS] Finished speaking for ${characterName}`);
      if (onEnd) onEnd();
      resolve({ success: true });
    };

    utterance.onerror = (event) => {
      console.error(`[TTS] Error for ${characterName}:`, event.error);
      if (onError) onError(event.error);
      reject(new Error(`Speech synthesis error: ${event.error}`));
    };

    // Speak
    window.speechSynthesis.cancel(); // Cancel any previous speech
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Select voice based on character voice type
 */
function selectVoiceForType(voices, voiceType) {
  const voiceTypeMap = {
    male_young: { keywords: ['male', 'young'], fallback: 'en-US', pitch: 1.2 },
    male_adult: { keywords: ['male', 'adult'], fallback: 'en-US', pitch: 0.8 },
    male_old: { keywords: ['male', 'senior', 'old'], fallback: 'en-US', pitch: 0.6 },
    female_young: { keywords: ['female', 'young'], fallback: 'en-US', pitch: 1.4 },
    female_adult: { keywords: ['female', 'adult'], fallback: 'en-US', pitch: 1.1 },
    female_old: { keywords: ['female', 'senior', 'old'], fallback: 'en-US', pitch: 0.9 }
  };

  const voiceProfile = voiceTypeMap[voiceType] || voiceTypeMap.male_adult;
  
  // Try to find voice matching keywords
  for (const keyword of voiceProfile.keywords) {
    const matched = voices.find(v => v.name.toLowerCase().includes(keyword.toLowerCase()));
    if (matched) return matched;
  }

  // Fallback to default English voice
  return voices.find(v => v.language.startsWith(voiceProfile.fallback)) || voices[0];
}

/**
 * Stop currently speaking text
 */
export function stopSpeech() {
  window.speechSynthesis.cancel();
  console.log('[TTS] Speech stopped');
}

/**
 * Pause speech
 */
export function pauseSpeech() {
  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
    console.log('[TTS] Speech paused');
  }
}

/**
 * Resume paused speech
 */
export function resumeSpeech() {
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    console.log('[TTS] Speech resumed');
  }
}

/**
 * Check if speech synthesis is currently active
 */
export function isSpeaking() {
  return window.speechSynthesis.speaking;
}

/**
 * Speak multiple texts sequentially
 */
export async function speakSequence(textArray, options = {}) {
  const {
    onProgress = null,
    onComplete = null
  } = options;

  for (let i = 0; i < textArray.length; i++) {
    const item = textArray[i];
    
    if (onProgress) {
      onProgress({ current: i + 1, total: textArray.length });
    }

    try {
      await speakText(item.text, {
        voiceType: item.voiceType || options.voiceType,
        characterName: item.characterName || 'Unknown',
        rate: item.rate || options.rate || 1.0,
        pitch: item.pitch || options.pitch || 1.0
      });

      // Small delay between speeches
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (err) {
      console.error(`[TTS] Error speaking item ${i}:`, err);
    }
  }

  if (onComplete) onComplete();
}

/**
 * Get voice metadata for storage
 */
export function getVoiceMetadata(voiceType) {
  const voiceMap = {
    male_young: { pitch: 1.2, rate: 1.0, description: 'Young male voice' },
    male_adult: { pitch: 0.8, rate: 0.9, description: 'Adult male voice' },
    male_old: { pitch: 0.6, rate: 0.85, description: 'Elderly male voice' },
    female_young: { pitch: 1.4, rate: 1.1, description: 'Young female voice' },
    female_adult: { pitch: 1.1, rate: 1.0, description: 'Adult female voice' },
    female_old: { pitch: 0.9, rate: 0.9, description: 'Elderly female voice' }
  };

  return voiceMap[voiceType] || voiceMap.male_adult;
}

export default {
  getAvailableVoices,
  speakText,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  isSpeaking,
  speakSequence,
  getVoiceMetadata
};
