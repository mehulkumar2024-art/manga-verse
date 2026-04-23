/**
 * Character Assignment Component
 * Allows users to assign manga characters to speech bubbles
 * Features: Character selection, color coding, voice assignment
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiX, FiEdit2, FiVolume2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './CharacterAssignment.css';

export default function CharacterAssignment({
  panels = [],
  characters = [],
  onAssignmentChange = null,
  onVoiceChange = null
}) {
  const [selectedBubble, setSelectedBubble] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [editingVoice, setEditingVoice] = useState(null);

  // Collect all speech bubbles from panels
  const allBubbles = [];
  panels.forEach(panel => {
    if (panel.speechBubbles) {
      panel.speechBubbles.forEach(bubble => {
        allBubbles.push({
          ...bubble,
          panelId: panel.panelId,
          panelIndex: panels.indexOf(panel)
        });
      });
    }
  });

  // Group bubbles by panel
  const bubblesByPanel = {};
  allBubbles.forEach(bubble => {
    if (!bubblesByPanel[bubble.panelId]) {
      bubblesByPanel[bubble.panelId] = [];
    }
    bubblesByPanel[bubble.panelId].push(bubble);
  });

  const voiceTypes = [
    { id: 'male_young', label: 'Young Male', pitch: 1.2 },
    { id: 'male_adult', label: 'Adult Male', pitch: 0.8 },
    { id: 'male_old', label: 'Elderly Male', pitch: 0.6 },
    { id: 'female_young', label: 'Young Female', pitch: 1.4 },
    { id: 'female_adult', label: 'Adult Female', pitch: 1.1 },
    { id: 'female_old', label: 'Elderly Female', pitch: 0.9 }
  ];

  /**
   * Assign character to bubble
   */
  const handleAssignCharacter = (bubbleId, characterId) => {
    const newAssignments = { ...assignments, [bubbleId]: characterId };
    setAssignments(newAssignments);
    
    if (onAssignmentChange) {
      onAssignmentChange({
        bubbleId,
        characterId,
        bubble: allBubbles.find(b => b.bubbleId === bubbleId)
      });
    }
    
    toast.success('Character assigned');
    setSelectedBubble(null);
  };

  /**
   * Assign voice type to character
   */
  const handleVoiceChange = (characterId, voiceType) => {
    if (onVoiceChange) {
      onVoiceChange({ characterId, voiceType });
    }
    setEditingVoice(null);
    toast.success('Voice assigned');
  };

  /**
   * Test voice preview
   */
  const testVoicePreview = (characterId, voiceType) => {
    const character = characters.find(c => c._id === characterId);
    if (!character) return;

    const utterance = new SpeechSynthesisUtterance(`Hello, I'm ${character.name}.`);
    const voiceData = voiceTypes.find(v => v.id === voiceType);
    
    if (voiceData) {
      utterance.pitch = voiceData.pitch;
      utterance.rate = 1.0;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Get unassigned bubbles
  const unassignedBubbles = allBubbles.filter(b => !assignments[b.bubbleId] && !b.speakerId);
  const assignmentProgress = allBubbles.length > 0 
    ? Math.round((allBubbles.length - unassignedBubbles.length) / allBubbles.length * 100)
    : 100;

  return (
    <motion.div
      className="character-assignment"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="ca-header">
        <h2>📖 Character Assignment</h2>
        <p>Assign characters to speech bubbles and select their voices</p>
      </div>

      {/* Progress Bar */}
      <div className="ca-progress">
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${assignmentProgress}%` }}
          />
        </div>
        <span className="progress-text">
          {allBubbles.length - unassignedBubbles.length}/{allBubbles.length} assigned
        </span>
      </div>

      <div className="ca-content">
        {/* Unassigned Bubbles Section */}
        <div className="ca-section ca-unassigned">
          <h3>📢 Speech Bubbles to Assign ({unassignedBubbles.length})</h3>
          
          {unassignedBubbles.length === 0 ? (
            <div className="ca-empty">
              <p>✨ All speech bubbles are assigned!</p>
            </div>
          ) : (
            <div className="bubbles-list">
              {unassignedBubbles.map((bubble, idx) => (
                <motion.div
                  key={bubble.bubbleId}
                  className="bubble-item unassigned"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedBubble(bubble)}
                >
                  <div className="bubble-preview">
                    <span className="bubble-type">{bubble.shape}</span>
                    <p className="bubble-text">
                      {bubble.ocrText || bubble.manualText || '(No text)'}
                    </p>
                  </div>
                  <button 
                    className="btn-select-character"
                    onClick={() => setSelectedBubble(bubble)}
                  >
                    Assign Character
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Character Selection Modal */}
        {selectedBubble && (
          <motion.div
            className="ca-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedBubble(null)}
          >
            <motion.div
              className="ca-modal"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Select Character</h3>
                <button 
                  className="btn-close"
                  onClick={() => setSelectedBubble(null)}
                >
                  <FiX />
                </button>
              </div>

              <div className="characters-grid">
                {characters.map(character => (
                  <motion.div
                    key={character._id}
                    className="character-option"
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleAssignCharacter(selectedBubble.bubbleId, character._id)}
                  >
                    {character.avatarUrl && (
                      <img src={character.avatarUrl} alt={character.name} />
                    )}
                    <div 
                      className="character-color-tag"
                      style={{ backgroundColor: character.colorTag || '#9b6bdc' }}
                    />
                    <p>{character.name}</p>
                    <small>{character.voiceType || 'No voice'}</small>
                  </motion.div>
                ))}

                <motion.div
                  className="character-option create-new"
                  whileHover={{ scale: 1.05 }}
                >
                  <span>+ Create New</span>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Voice Assignment Section */}
        <div className="ca-section ca-voices">
          <h3>🎤 Character Voices</h3>
          
          {characters.length === 0 ? (
            <div className="ca-empty">
              <p>No characters added yet</p>
            </div>
          ) : (
            <div className="voices-list">
              {characters.map(character => (
                <motion.div
                  key={character._id}
                  className="voice-item"
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  <div className="voice-character">
                    {character.avatarUrl && (
                      <img src={character.avatarUrl} alt={character.name} />
                    )}
                    <div>
                      <h4>{character.name}</h4>
                      <p className="voice-type">
                        {character.voiceType ? voiceTypes.find(v => v.id === character.voiceType)?.label : 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  <div className="voice-controls">
                    {character.voiceType && (
                      <button
                        className="btn-test-voice"
                        onClick={() => testVoicePreview(character._id, character.voiceType)}
                        title="Test voice preview"
                      >
                        <FiVolume2 /> Test
                      </button>
                    )}
                    <button
                      className="btn-edit-voice"
                      onClick={() => setEditingVoice(character._id)}
                    >
                      <FiEdit2 /> Voice
                    </button>
                  </div>

                  {/* Voice Type Dropdown */}
                  {editingVoice === character._id && (
                    <motion.div
                      className="voice-dropdown"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <div className="voice-options">
                        {voiceTypes.map(voice => (
                          <button
                            key={voice.id}
                            className={`voice-option ${character.voiceType === voice.id ? 'active' : ''}`}
                            onClick={() => handleVoiceChange(character._id, voice.id)}
                          >
                            <span className="voice-label">{voice.label}</span>
                            <button
                              className="btn-preview"
                              onClick={(e) => {
                                e.stopPropagation();
                                testVoicePreview(character._id, voice.id);
                              }}
                            >
                              🔊
                            </button>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="ca-summary">
        <div className="summary-stat">
          <span className="stat-value">{allBubbles.length}</span>
          <span className="stat-label">Total Bubbles</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{characters.length}</span>
          <span className="stat-label">Characters</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{assignmentProgress}%</span>
          <span className="stat-label">Assigned</span>
        </div>
      </div>
    </motion.div>
  );
}
