/**
 * Text-to-Speech (TTS) Service
 * Converts speech bubble text to audio using Web Speech API (browser) or ElevenLabs (backend)
 * 
 * Supports:
 * - Web Speech API (free, browser-native)
 * - ElevenLabs API (premium, high quality)
 * - Google Cloud Text-to-Speech (optional, premium)
 */

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

/**
 * Generate voice for a speech bubble
 */
async function generateVoice({ manifestId, panelId, bubbleId, text, characterId, voiceType = 'male_young', voiceId = null }) {
  try {
    console.log(`[TTS] Generating voice for bubble ${bubbleId}`);
    
    const provider = process.env.TTS_PROVIDER || 'web-speech';
    
    let result;
    if (provider === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
      result = await generateWithElevenLabs(text, voiceId, voiceType);
    } else {
      // Fallback to metadata that frontend will use with Web Speech API
      result = generateWebSpeechMetadata(text, voiceType, characterId);
    }
    
    return {
      success: true,
      manifestId,
      panelId,
      bubbleId,
      characterId,
      voiceId: voiceId || null,
      voiceType,
      ttsId: `tts_${uuidv4().substring(0, 8)}`,
      text: text.substring(0, 100),
      provider,
      audioUrl: result.audioUrl || null,
      voiceMetadata: result.voiceMetadata || null,
      generatedAt: new Date()
    };
  } catch (err) {
    console.error('[TTS] Error:', err);
    throw new Error(`TTS generation failed: ${err.message}`);
  }
}

/**
 * Generate voice using ElevenLabs API (premium option)
 */
async function generateWithElevenLabs(text, voiceId, voiceType) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ElevenLabs API key not configured');
  
  // Map voice type to ElevenLabs voice IDs
  const voiceIdMap = {
    male_young: process.env.ELEVENLABS_VOICE_MALE_YOUNG || 'EXAVITQu4vr4xnSDxMaL',
    male_adult: process.env.ELEVENLABS_VOICE_MALE_ADULT || 'G0FwyJnSFvxLYfpvSpOK',
    female_young: process.env.ELEVENLABS_VOICE_FEMALE_YOUNG || 'EXAVITQu4vr4xnSDxMaL',
    female_adult: process.env.ELEVENLABS_VOICE_FEMALE_ADULT || 'G0FwyJnSFvxLYfpvSpOK'
  };
  
  const selectedVoiceId = voiceId || voiceIdMap[voiceType] || voiceIdMap.male_adult;
  
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`);
  }
  
  const audioBuffer = await response.buffer();
  
  // Save audio file
  const audioDir = path.join(process.cwd(), 'public', 'audio');
  await fs.mkdir(audioDir, { recursive: true });
  
  const audioFilename = `tts_${uuidv4().substring(0, 8)}.mp3`;
  const audioPath = path.join(audioDir, audioFilename);
  await fs.writeFile(audioPath, audioBuffer);
  
  const audioUrl = `/public/audio/${audioFilename}`;
  
  console.log(`[TTS] ElevenLabs audio generated: ${audioUrl}`);
  
  return {
    audioUrl,
    voiceMetadata: {
      provider: 'elevenlabs',
      voiceId: selectedVoiceId,
      voiceType
    }
  };
}

/**
 * Generate Web Speech API metadata (no actual audio generation on backend)
 * The frontend will handle voice synthesis using Web Speech API
 */
function generateWebSpeechMetadata(text, voiceType, characterId) {
  // Map voice types to Web Speech API voice characteristics
  const voiceMap = {
    male_young: { pitch: 1.2, rate: 1.0 },
    male_adult: { pitch: 0.8, rate: 0.9 },
    male_old: { pitch: 0.6, rate: 0.85 },
    female_young: { pitch: 1.4, rate: 1.1 },
    female_adult: { pitch: 1.1, rate: 1.0 },
    female_old: { pitch: 0.9, rate: 0.9 }
  };
  
  const voiceSettings = voiceMap[voiceType] || voiceMap.male_adult;
  
  return {
    voiceMetadata: {
      provider: 'web-speech',
      voiceType,
      synthSettings: {
        pitch: voiceSettings.pitch,
        rate: voiceSettings.rate,
        volume: 1.0,
        lang: 'en-US'
      },
      instructionsForFrontend: 'Use window.speechSynthesis.speak() with provided settings'
    }
  };
}

/**
 * Generate voice for all speech bubbles in a panel
 */
async function generateVoicesForPanel({ manifestId, panelId, speechBubbles, imageUrl, characterMap = {} }) {
  try {
    console.log(`[TTS] Generating voices for ${speechBubbles.length} bubbles`);
    
    const results = [];
    
    for (const bubble of speechBubbles) {
      try {
        // Find character for this bubble
        const characterId = bubble.speakerId || characterMap[bubble.bubbleId];
        const voiceType = bubble.voiceType || 'male_adult';
        
        const result = await generateVoice({
          manifestId,
          panelId,
          bubbleId: bubble.bubbleId,
          text: bubble.ocrText || bubble.manualText || '',
          characterId,
          voiceType,
          voiceId: bubble.voiceId || null
        });
        results.push(result);
      } catch (err) {
        console.error(`[TTS] Failed for bubble ${bubble.bubbleId}:`, err.message);
        results.push({
          bubbleId: bubble.bubbleId,
          success: false,
          error: err.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`[TTS] Completed: ${successCount}/${speechBubbles.length} bubbles`);
    
    return {
      success: true,
      manifestId,
      panelId,
      results,
      generatedAt: new Date()
    };
  } catch (err) {
    console.error('[TTS] Panel generation error:', err);
    throw new Error(`Panel TTS failed: ${err.message}`);
  }
}

/**
 * List available voices for character
 */
function getAvailableVoices(voiceType) {
  const voicePresets = {
    male_young: {
      label: 'Young Male',
      voiceType: 'male_young',
      description: 'High-pitched, energetic voice suitable for young male characters'
    },
    male_adult: {
      label: 'Adult Male',
      voiceType: 'male_adult',
      description: 'Standard male voice for adult characters'
    },
    male_old: {
      label: 'Elderly Male',
      voiceType: 'male_old',
      description: 'Deep, mature voice for elderly characters'
    },
    female_young: {
      label: 'Young Female',
      voiceType: 'female_young',
      description: 'High-pitched voice suitable for young female characters'
    },
    female_adult: {
      label: 'Adult Female',
      voiceType: 'female_adult',
      description: 'Standard female voice for adult characters'
    },
    female_old: {
      label: 'Elderly Female',
      voiceType: 'female_old',
      description: 'Mature female voice for elderly characters'
    }
  };
  
  return voicePresets[voiceType] || voicePresets.male_adult;
}

module.exports = {
  generateVoice,
  generateVoicesForPanel,
  generateWithElevenLabs,
  generateWebSpeechMetadata,
  getAvailableVoices
};
