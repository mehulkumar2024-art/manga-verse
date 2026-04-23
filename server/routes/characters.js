// routes/characters.js
const express   = require('express');
const router    = express.Router();
const { body, validationResult } = require('express-validator');
const { ID, Query } = require('node-appwrite');
const { databases } = require('../config/appwrite');
const { verifyToken } = require('../middleware/auth');
const { mapDoc, mapList } = require('../utils/appwriteMapper');

const DB = 'mangaverse';
const CHARACTERS = 'characters';
const PANEL_MANIFESTS = 'panel_manifests';

function vGuard(req, res) {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(400).json({ success: false, errors: e.array() }); return true; }
  return false;
}

// ── GET all characters for a manga ──────────────────────────────
router.get('/manga/:mangaId', verifyToken, async (req, res) => {
  try {
    const response = await databases.listDocuments(DB, CHARACTERS, [
      Query.equal('mangaId', req.params.mangaId),
      Query.orderAsc('name')
    ]);
    res.json({ success: true, data: mapList(response) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST create new character ────────────────────────────────────
router.post('/manga/:mangaId',
  verifyToken,
  [ body('name').trim().notEmpty().withMessage('Name is required') ],
  async (req, res) => {
    if (vGuard(req, res)) return;
    const { name, voiceType, voiceId, colorTag, isMainCharacter, aliases } = req.body;
    try {
      const charData = {
        mangaId:     req.params.mangaId,
        uploaderId:  req.user._id || req.user.uid,
        name, 
        voiceType: voiceType || '', 
        voiceId: voiceId || '',
        colorTag: colorTag || '', 
        isMainCharacter: !!isMainCharacter, 
        aliases: Array.isArray(aliases) ? aliases : []
      };
      const created = await databases.createDocument(DB, CHARACTERS, ID.unique(), charData);
      res.status(201).json({ success: true, data: mapDoc(created) });
    } catch (err) {
      if (err.code === 409)
        return res.status(409).json({ success: false, message: `Character "${req.body.name}" already exists` });
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── PUT update character ─────────────────────────────────────────
router.put('/:characterId', verifyToken, async (req, res) => {
  try {
    const { name, voiceType, colorTag, isMainCharacter, aliases } = req.body;
    
    // Check if it exists
    const existing = await databases.getDocument(DB, CHARACTERS, req.params.characterId);
    if (!existing) return res.status(404).json({ success: false, message: 'Character not found' });
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (voiceType !== undefined) updates.voiceType = voiceType;
    if (colorTag !== undefined) updates.colorTag = colorTag;
    if (isMainCharacter !== undefined) updates.isMainCharacter = !!isMainCharacter;
    if (aliases !== undefined) updates.aliases = Array.isArray(aliases) ? aliases : [];

    const char = await databases.updateDocument(DB, CHARACTERS, req.params.characterId, updates);
    res.json({ success: true, data: mapDoc(char) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE character ─────────────────────────────────────────────
router.delete('/:characterId', verifyToken, async (req, res) => {
  try {
    await databases.deleteDocument(DB, CHARACTERS, req.params.characterId);
    res.json({ success: true, message: 'Character deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST tag character in a panel ───────────────────────────────
// Body: { chapterId, pageNumber, panelId }
router.post('/:characterId/appearance', verifyToken, async (req, res) => {
  try {
    const { chapterId, pageNumber, panelId } = req.body;
    const char = await databases.getDocument(DB, CHARACTERS, req.params.characterId);
    if (!char) return res.status(404).json({ success: false, message: 'Not found' });

    // Update the speech bubble speakerId in the manifest if bubbleId is provided
    if (req.body.bubbleId) {
      const response = await databases.listDocuments(DB, PANEL_MANIFESTS, [
        Query.equal('chapterId', chapterId),
        Query.equal('pageNumber', parseInt(pageNumber))
      ]);

      if (response.documents.length > 0) {
        const manifest = response.documents[0];
        let panels = [];
        try { panels = JSON.parse(manifest.panels); } catch {}
        
        const panel = panels.find(p => p.panelId === panelId);
        if (panel && panel.speechBubbles) {
          const bubble = panel.speechBubbles.find(b => b.bubbleId === req.body.bubbleId);
          if (bubble) bubble.speakerId = req.params.characterId;
          
          await databases.updateDocument(DB, PANEL_MANIFESTS, manifest.$id, {
            panels: JSON.stringify(panels)
          });
        }
      }
    }

    res.json({ success: true, data: mapDoc(char) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE untag appearance ──────────────────────────────────────
router.delete('/:characterId/appearance', verifyToken, async (req, res) => {
  // Appwrite schema doesn't store reverse lookup 'appearances'
  res.json({ success: true });
});

// ── PUT assign voice ────────────────────────────────────────────
// Body: { voiceId, voiceName, voiceType }
router.put('/:characterId/voice', verifyToken, async (req, res) => {
  try {
    const { voiceId, voiceType } = req.body;
    
    const updates = {};
    if (voiceId !== undefined) updates.voiceId = voiceId;
    if (voiceType !== undefined) updates.voiceType = voiceType;

    const char = await databases.updateDocument(DB, CHARACTERS, req.params.characterId, updates);
    res.json({ success: true, data: mapDoc(char) });
  } catch (err) {
    if (err.code === 404) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
