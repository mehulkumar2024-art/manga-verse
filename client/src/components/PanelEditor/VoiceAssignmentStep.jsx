import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const VOICE_LIBRARY = [
  { id: 'v1', name: 'Kaelen', gender: 'Male', age: 'Adult', style: 'Action / Heroic', preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'v2', name: 'Elora', gender: 'Female', age: 'Adult', style: 'Sweet / Friendly', preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'v3', name: 'Borg', gender: 'Male', age: 'Large', style: 'Deep / Gritty', preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'v4', name: 'Mira', gender: 'Female', age: 'Young', style: 'High-pitched / Energetic', preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'v5', name: 'The Narrator', gender: 'Male', age: 'Old', style: 'Deep / Dramatic', preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
  { id: 'v6', name: 'Zoe', gender: 'Female', age: 'Young', style: 'Cute / Playful', preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
  { id: 'v7', name: 'Commander', gender: 'Male', age: 'Adult', style: 'Authoritative', preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
];

export default function VoiceAssignmentStep({ characters, onAssignVoice, onBack, onFinish }) {
  const [selectedCharId, setSelectedCharId] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = React.useRef(null);
  const [voiceSettings, setVoiceSettings] = useState({}); // { charId: { pitch: 0, speed: 1 } }

  const handlePlayPreview = (e, voice, settings) => {
    e.stopPropagation();
    if (playingId === voice.id) {
      audioRef.current.pause();
      setPlayingId(null);
    } else {
      setPlayingId(voice.id);
      if (audioRef.current) {
        audioRef.current.src = voice.preview;
        audioRef.current.playbackRate = settings?.speed || 1.0;
        audioRef.current.preservesPitch = false; // allow pitch to change with speed natively if supported
        audioRef.current.play();
      }
    }
  };

  const updateVoiceSetting = (charId, key, value) => {
    setVoiceSettings(prev => ({
      ...prev,
      [charId]: { ...(prev[charId] || { pitch: 0, speed: 1.0 }), [key]: value }
    }));
  };

  const handleApplyModifications = (charId, voiceId, voiceStyle) => {
    const settings = voiceSettings[charId] || { pitch: 0, speed: 1.0 };
    // Pass settings as part of voiceType for now
    const modifiedStyle = JSON.stringify({ style: voiceStyle, pitch: settings.pitch, speed: settings.speed });
    onAssignVoice(charId, voiceId, modifiedStyle);
  };

  const getInitialSettings = (char) => {
    if (char.voiceType && char.voiceType.startsWith('{')) {
      try {
        const parsed = JSON.parse(char.voiceType);
        return { pitch: parsed.pitch || 0, speed: parsed.speed || 1.0 };
      } catch (e) {}
    }
    return { pitch: 0, speed: 1.0 };
  };

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', background: '#0d0d0f' }}>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

      {/* CHARACTERS LIST */}
      <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: 'white', letterSpacing: 1, margin: 0 }}>
            Voice Assignment
          </h2>
          <p style={{ color: '#6b6b7e', fontSize: 14, marginTop: 4 }}>
            Assign a unique voice to each character identified in the manga.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {characters.map(char => {
            const assignedVoice = VOICE_LIBRARY.find(v => v.id === char.voiceId);
            const isSelected = selectedCharId === char._id;
            const settings = voiceSettings[char._id] || getInitialSettings(char);
            
            // Extract style if it was stringified
            let displayStyle = assignedVoice?.style;
            if (char.voiceType && char.voiceType.startsWith('{')) {
              try {
                const parsed = JSON.parse(char.voiceType);
                displayStyle = parsed.style;
              } catch (e) {}
            }

            return (
              <motion.div
                key={char._id}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedCharId(char._id)}
                style={{
                  background: isSelected ? '#1a1a20' : '#141419',
                  borderRadius: 16,
                  padding: 24,
                  border: `2px solid ${isSelected ? '#9b6bdc' : 'transparent'}`,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 8px 32px rgba(155, 107, 220, 0.2)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{ 
                    width: 48, height: 48, borderRadius: 12, 
                    background: char.colorTag + '33', border: `1px solid ${char.colorTag}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: char.colorTag, fontWeight: 'bold'
                  }}>
                    {char.name[0]}
                  </div>
                  <div>
                    <div style={{ color: 'white', fontWeight: 600, fontSize: 18 }}>{char.name}</div>
                    <div style={{ color: '#6b6b7e', fontSize: 12 }}>{char.voiceId ? 'Voice Assigned' : 'No Voice Assigned'}</div>
                  </div>
                </div>

                {assignedVoice ? (
                  <div style={{ 
                    background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16,
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: '#9b6bdc', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Assigned Voice</div>
                        <div style={{ color: 'white', fontWeight: 500 }}>{assignedVoice.name}</div>
                        <div style={{ color: '#6b6b7e', fontSize: 11 }}>{displayStyle}</div>
                      </div>
                      <button 
                        onClick={(e) => handlePlayPreview(e, assignedVoice, settings)}
                        style={{ 
                          width: 32, height: 32, borderRadius: '50%', background: '#9b6bdc', 
                          border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        {playingId === assignedVoice.id ? '⏸' : '▶'}
                      </button>
                    </div>

                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 11, color: '#9898a8', marginBottom: 8 }}>Modify Voice Settings</div>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b6b7e', marginBottom: 4 }}>
                            <span>Speed</span>
                            <span>{settings.speed}x</span>
                          </div>
                          <input type="range" min="0.5" max="2.0" step="0.1" 
                            value={settings.speed} 
                            onChange={(e) => updateVoiceSetting(char._id, 'speed', parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#9b6bdc' }} 
                            onClick={e => e.stopPropagation()} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b6b7e', marginBottom: 4 }}>
                            <span>Pitch</span>
                            <span>{settings.pitch}</span>
                          </div>
                          <input type="range" min="-10" max="10" step="1" 
                            value={settings.pitch} 
                            onChange={(e) => updateVoiceSetting(char._id, 'pitch', parseInt(e.target.value))}
                            style={{ width: '100%', accentColor: '#9b6bdc' }} 
                            onClick={e => e.stopPropagation()} />
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleApplyModifications(char._id, assignedVoice.id, assignedVoice.style); }}
                        style={{
                          width: '100%', padding: '6px', borderRadius: 6, background: '#26262f',
                          color: '#c8c8d4', fontSize: 11, border: 'none', cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#35353f'}
                        onMouseLeave={e => e.currentTarget.style.background = '#26262f'}
                      >
                        Save Modifications
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    padding: '16px', borderRadius: 12, border: '1px dashed #35353f',
                    textAlign: 'center', color: '#35353f', fontSize: 13
                  }}>
                    Select to assign a voice
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* VOICE LIBRARY SIDEBAR */}
      <div style={{ 
        width: 380, flexShrink: 0, background: '#141419', borderLeft: '1px solid #26262f',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: 24, borderBottom: '1px solid #26262f' }}>
          <div style={{ color: 'white', fontWeight: 600, marginBottom: 4 }}>Voice Library</div>
          <div style={{ color: '#6b6b7e', fontSize: 12 }}>Choose a voice for {selectedCharId ? characters.find(c => c._id === selectedCharId)?.name : 'selected character'}</div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          {!selectedCharId ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#35353f' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>👈</div>
              <div>Select a character to assign a voice</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {VOICE_LIBRARY.map(voice => (
                <div 
                  key={voice.id}
                  onClick={() => onAssignVoice(selectedCharId, voice.id, voice.style)}
                  style={{
                    padding: '16px 20px', borderRadius: 12, background: '#1a1a20',
                    border: '1px solid #26262f', cursor: 'pointer', transition: 'all 0.2s',
                    position: 'relative', overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#9b6bdc'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#26262f'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>{voice.name}</div>
                      <div style={{ color: '#6b6b7e', fontSize: 11 }}>{voice.gender} • {voice.age} • {voice.style}</div>
                    </div>
                    <button 
                      onClick={(e) => handlePlayPreview(e, voice)}
                      style={{ 
                        width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', 
                        border: 'none', color: '#9b6bdc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      {playingId === voice.id ? '⏸' : '▶'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: 24, background: '#0d0d0f', borderTop: '1px solid #26262f', display: 'flex', gap: 12 }}>
          <button 
            onClick={onBack}
            style={{ 
              flex: 1, padding: '12px', borderRadius: 8, background: '#1a1a20', color: 'white', 
              border: '1px solid #26262f', cursor: 'pointer', fontWeight: 500 
            }}
          >
            Back
          </button>
          <button 
            onClick={onFinish}
            style={{ 
              flex: 2, padding: '12px', borderRadius: 8, background: '#9b6bdc', color: 'white', 
              border: 'none', cursor: 'pointer', fontWeight: 600 
            }}
          >
            Generate Cinematic
          </button>
        </div>
      </div>
    </div>
  );
}
