/**
 * Manga Autoplay Reader Component
 * Features: Sequential panel display, animated text, character voices, auto-scroll
 * Reads manga like watching an animated video
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiPlay, FiPause, FiSkipForward, FiSkipBack, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { panelAnimations, textAnimations, bubbleAnimations } from '../services/animationUtils';
import ttsService from '../services/ttsClient';
import toast from 'react-hot-toast';
import './AutoplayReader.css';

export default function AutoplayReader({
  chapter = null,
  panels = [],
  characters = {},
  autoPlay = true,
  readingDirection = 'ltr',
  onPanelChange = null
}) {
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [panelDuration, setPanelDuration] = useState(3); // seconds
  const [enableVoice, setEnableVoice] = useState(true);
  const [voiceVolume, setVoiceVolume] = useState(1);
  const autoPlayIntervalRef = useRef(null);
  const panelTimeoutRef = useRef(null);

  const currentPanel = panels[currentPanelIndex];

  /**
   * Handle autoplay timing
   */
  useEffect(() => {
    if (isPlaying && currentPanelIndex < panels.length) {
      // Clear existing timeout
      if (panelTimeoutRef.current) {
        clearTimeout(panelTimeoutRef.current);
      }

      // Calculate duration based on number of speech bubbles and text length
      let duration = panelDuration;
      if (currentPanel?.speechBubbles) {
        duration += currentPanel.speechBubbles.length * 2;
        const totalTextLength = currentPanel.speechBubbles.reduce(
          (sum, b) => sum + (b.ocrText?.length || 0),
          0
        );
        duration += totalTextLength * 0.05; // 50ms per character
      }

      // Set timeout for next panel
      panelTimeoutRef.current = setTimeout(() => {
        if (currentPanelIndex < panels.length - 1) {
          setCurrentPanelIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, duration * 1000);

      return () => {
        if (panelTimeoutRef.current) {
          clearTimeout(panelTimeoutRef.current);
        }
      };
    }
  }, [isPlaying, currentPanelIndex, panels.length, panelDuration, currentPanel]);

  /**
   * Play voices for current panel
   */
  const playPanelVoices = async () => {
    if (!enableVoice || !currentPanel?.speechBubbles) return;

    for (const bubble of currentPanel.speechBubbles) {
      if (!bubble.ocrText && !bubble.manualText) continue;

      const character = characters[bubble.speakerId];
      const text = bubble.ocrText || bubble.manualText;
      const voiceType = character?.voiceType || 'male_adult';

      try {
        await ttsService.speakText(text, {
          voiceType,
          characterName: character?.name || 'Unknown',
          volume: voiceVolume,
          rate: 1.0,
          pitch: 1.0
        });
      } catch (err) {
        console.error('Voice playback error:', err);
      }
    }
  };

  /**
   * Navigate to previous panel
   */
  const goToPreviousPanel = () => {
    if (currentPanelIndex > 0) {
      ttsService.stopSpeech();
      setCurrentPanelIndex(prev => prev - 1);
      if (onPanelChange) onPanelChange(currentPanelIndex - 1);
    }
  };

  /**
   * Navigate to next panel
   */
  const goToNextPanel = () => {
    if (currentPanelIndex < panels.length - 1) {
      ttsService.stopSpeech();
      setCurrentPanelIndex(prev => prev + 1);
      if (onPanelChange) onPanelChange(currentPanelIndex + 1);
    }
  };

  /**
   * Toggle play/pause
   */
  const togglePlayPause = () => {
    if (currentPanelIndex >= panels.length) {
      setCurrentPanelIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  /**
   * Auto-play voices when panel changes
   */
  useEffect(() => {
    if (currentPanel) {
      playPanelVoices();
      if (onPanelChange) {
        onPanelChange(currentPanelIndex);
      }
    }
  }, [currentPanelIndex, currentPanel]);

  if (!currentPanel) {
    return (
      <div className="autoplay-reader empty">
        <p>No panels to display</p>
      </div>
    );
  }

  const panelVariant = readingDirection === 'rtl' 
    ? panelAnimations.slideInRight 
    : panelAnimations.slideInLeft;

  return (
    <div className="autoplay-reader">
      {/* Main Panel Display */}
      <motion.div
        className="reader-panel-container"
        key={currentPanel.panelId}
        {...panelVariant}
      >
        <div className="panel-image">
          {/* Panel image with speech bubbles overlay */}
          <div className="panel-content">
            <div className="panel-counter">
              Panel {currentPanelIndex + 1} / {panels.length}
            </div>

            {/* Speech Bubbles with Animations */}
            <div className="bubbles-container">
              {currentPanel.speechBubbles?.map((bubble, idx) => {
                const character = characters[bubble.speakerId];
                return (
                  <motion.div
                    key={bubble.bubbleId}
                    className={`speech-bubble ${bubble.shape}`}
                    style={{
                      left: `${bubble.bbox.x}px`,
                      top: `${bubble.bbox.y}px`,
                      width: `${bubble.bbox.w}px`,
                      height: `${bubble.bbox.h}px`
                    }}
                    {...bubbleAnimations.pop}
                    transition={{ delay: idx * 0.2 }}
                  >
                    <div className="bubble-content">
                      <motion.p
                        className="bubble-text"
                        {...textAnimations.typewriter(
                          (bubble.ocrText || bubble.manualText || '').length
                        )}
                      >
                        {bubble.ocrText || bubble.manualText || '(No text)'}
                      </motion.p>
                    </div>

                    {character && (
                      <div className="speaker-indicator">
                        {character.avatarUrl && (
                          <img src={character.avatarUrl} alt={character.name} />
                        )}
                        <span>{character.name}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel Info */}
        <div className="panel-info">
          <h3>Panel {currentPanelIndex + 1}</h3>
          {currentPanel.emotionalIntensity && (
            <p className="emotion-indicator">
              Intensity: {'⚡'.repeat(Math.round(currentPanel.emotionalIntensity * 5))}
            </p>
          )}
          <p className="character-count">
            {currentPanel.speechBubbles?.length || 0} dialogue bubbles
          </p>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        className="reader-controls"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Playback Controls */}
        <div className="control-group playback">
          <button
            className="control-btn prev"
            onClick={goToPreviousPanel}
            disabled={currentPanelIndex === 0}
            title="Previous panel"
          >
            <FiSkipBack />
          </button>

          <button
            className={`control-btn play-pause ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <FiPause /> : <FiPlay />}
          </button>

          <button
            className="control-btn next"
            onClick={goToNextPanel}
            disabled={currentPanelIndex === panels.length - 1}
            title="Next panel"
          >
            <FiSkipForward />
          </button>
        </div>

        {/* Speed Control */}
        <div className="control-group speed">
          <label>Speed:</label>
          <input
            type="range"
            min="1"
            max="8"
            value={panelDuration}
            onChange={(e) => setPanelDuration(parseInt(e.target.value))}
            className="speed-slider"
          />
          <span>{panelDuration}s</span>
        </div>

        {/* Voice Control */}
        <div className="control-group voice">
          <button
            className={`control-btn voice-toggle ${enableVoice ? 'enabled' : 'disabled'}`}
            onClick={() => setEnableVoice(!enableVoice)}
            title={enableVoice ? 'Mute voices' : 'Enable voices'}
          >
            {enableVoice ? <FiVolume2 /> : <FiVolumeX />}
          </button>

          {enableVoice && (
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={voiceVolume}
              onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
              className="volume-slider"
              title="Voice volume"
            />
          )}
        </div>

        {/* Progress Bar */}
        <div className="control-group progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((currentPanelIndex + 1) / panels.length) * 100}%`
              }}
            />
          </div>
          <span className="progress-text">
            {currentPanelIndex + 1} / {panels.length}
          </span>
        </div>
      </motion.div>

      {/* End of Chapter */}
      {currentPanelIndex === panels.length - 1 && !isPlaying && (
        <motion.div
          className="reader-end-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2>📖 End of Chapter</h2>
          <p>You've finished reading this chapter!</p>
          <button
            className="btn-restart"
            onClick={() => {
              setCurrentPanelIndex(0);
              setIsPlaying(true);
            }}
          >
            Restart Chapter
          </button>
        </motion.div>
      )}
    </div>
  );
}
