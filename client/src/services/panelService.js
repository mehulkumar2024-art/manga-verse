// src/services/panelService.js
// All API calls for panel manifests and characters.
import api from '../config/api';

// ── Panel Manifests ───────────────────────────────────────────────

export const panelService = {
  /** Get all page manifests for a chapter (lightweight, no detectedPanels) */
  getChapterManifests: (chapterId) =>
    api.get(`/panels/chapter/${chapterId}`).then(res => res.data),

  /** Get chapter confirmation status summary */
  getChapterStatus: (chapterId) =>
    api.get(`/panels/chapter/${chapterId}/status`).then(res => res.data),

  /** Get single page manifest (full, with panels) */
  getPageManifest: (chapterId, pageNumber) =>
    api.get(`/panels/${chapterId}/${pageNumber}`).then(res => res.data),

  /** Trigger (re)detection for a page - Instant detection with immediate results */
  detectPage: (chapterId, pageNumber, payload) =>
    api.post(`/panels/${chapterId}/${pageNumber}/detect-instant`, payload).then(res => res.data),

  /** Trigger character detection - Instant detection with immediate results */
  detectCharactersInstant: (chapterId, pageNumber) =>
    api.post(`/panels/${chapterId}/${pageNumber}/detect-characters-instant`).then(res => res.data),

  /** Save corrected panels to backend */
  savePanels: (chapterId, pageNumber, panels, correctionNote = '') =>
    api.put(`/panels/${chapterId}/${pageNumber}`, { panels, correctionNote }).then(res => res.data),

  /** Confirm a page (lock panels) */
  confirmPage: (chapterId, pageNumber) =>
    api.post(`/panels/${chapterId}/${pageNumber}/confirm`).then(res => res.data),

  /** Reset page to auto-detected panels */
  resetPage: (chapterId, pageNumber) =>
    api.post(`/panels/${chapterId}/${pageNumber}/reset`).then(res => res.data),

  /** Log a correction action */
  logCorrection: (chapterId, pageNumber, action, description) =>
    api.post(`/panels/${chapterId}/${pageNumber}/correction`, { action, description }).then(res => res.data),
};

// ── Characters ───────────────────────────────────────────────────

export const characterService = {
  /** Get all characters for a manga */
  getMangaCharacters: (mangaId) =>
    api.get(`/characters/manga/${mangaId}`).then(res => res.data),

  /** Create a new character */
  createCharacter: (mangaId, payload) =>
    api.post(`/characters/manga/${mangaId}`, payload).then(res => res.data),

  /** Update character details */
  updateCharacter: (characterId, payload) =>
    api.put(`/characters/${characterId}`, payload).then(res => res.data),

  /** Delete a character */
  deleteCharacter: (characterId) =>
    api.delete(`/characters/${characterId}`).then(res => res.data),

  /** Tag character in a panel */
  tagAppearance: (characterId, payload) =>
    api.post(`/characters/${characterId}/appearance`, payload).then(res => res.data),

  /** Remove character from a panel */
  untagAppearance: (characterId, payload) =>
    api.delete(`/characters/${characterId}/appearance`, { data: payload }).then(res => res.data),

  /** Assign a voice to a character */
  assignVoice: (characterId, payload) =>
    api.put(`/characters/${characterId}/voice`, payload).then(res => res.data),
};
