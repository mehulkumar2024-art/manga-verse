/**
 * PANEL ROUTES - With integrated detection, character recognition, OCR, and TTS
 * Features: Panel detection via queue, character detection, speech bubble OCR,
 * text-to-speech synthesis, and comprehensive error handling
 */

const express  = require('express');
const router   = express.Router();
const { body, validationResult } = require('express-validator');
const { ID, Query } = require('node-appwrite');
const { databases } = require('../config/appwrite');
const { verifyToken, checkOwnership } = require('../middleware/auth');
const { mapDoc, mapList } = require('../utils/appwriteMapper');
const { 
  panelDetectionQueue, 
  characterDetectionQueue, 
  ocrQueue, 
  ttsQueue,
  addPanelDetection,
  addCharacterDetection,
  addOCR,
  addTTS
} = require('../services/queueService');

const DB = 'mangaverse';
const PANEL_MANIFESTS = 'panel_manifests';
const CHAPTERS = 'chapters';
const MANGAS = 'mangas';

function validationGuard(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

function normPanel(p, index, pageNumber) {
  const prefix = `p${pageNumber}_`;
  let panelId = p.panelId || `panel_${Date.now()}_${index}`;
  if (!panelId.startsWith(prefix)) panelId = prefix + panelId;
  
  return {
    panelId,
    readingOrder: typeof p.readingOrder === 'number' ? p.readingOrder : index,
    label:        p.label        || `Panel ${index + 1}`,
    bbox: {
      x: Math.round(p.bbox.x), y: Math.round(p.bbox.y),
      w: Math.max(10, Math.round(p.bbox.w)),
      h: Math.max(10, Math.round(p.bbox.h)),
    },
    panelType:          p.panelType          || 'bordered',
    colorTag:           p.colorTag           || '#e8341a',
    speechBubbles:      p.speechBubbles      || [],
    contentZones:       p.contentZones       || [],
    suggestedCamera:    p.suggestedCamera    || 'static',
    emotionalIntensity: p.emotionalIntensity || 0,
    characterRegions:   p.characterRegions   || [],
  };
}

// Parse stringified arrays
function parseManifest(manifest) {
  if (!manifest) return null;
  if (typeof manifest.panels === 'string') {
    try { manifest.panels = JSON.parse(manifest.panels); } catch { manifest.panels = []; }
  }
  if (typeof manifest.detectedPanels === 'string') {
    try { manifest.detectedPanels = JSON.parse(manifest.detectedPanels); } catch { manifest.detectedPanels = []; }
  }
  return manifest;
}

// Get all pages for a chapter
router.get('/chapter/:chapterId', verifyToken, async (req, res) => {
  try {
    const response = await databases.listDocuments(DB, PANEL_MANIFESTS, [
      Query.equal('chapterId', req.params.chapterId),
      Query.orderAsc('pageNumber')
    ]);
    
    let manifests = mapList(response).map(parseManifest);
    // Remove detectedPanels to mimic lean response
    manifests = manifests.map(m => {
        delete m.detectedPanels;
        return m;
    });

    res.json({ success: true, data: manifests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Confirmation summary
router.get('/chapter/:chapterId/status', verifyToken, async (req, res) => {
  try {
    const response = await databases.listDocuments(DB, PANEL_MANIFESTS, [
      Query.equal('chapterId', req.params.chapterId)
    ]);
    
    const all = mapList(response);

    const total     = all.length;
    const confirmed = all.filter(m => m.status === 'confirmed').length;
    const reviewing = all.filter(m => m.status === 'reviewing').length;
    const pending   = all.filter(m => ['pending_detection','detecting','detected'].includes(m.status)).length;

    res.json({
      success: true,
      data: {
        total, confirmed, reviewing, pending,
        allConfirmed: confirmed === total && total > 0,
        pages: all.map(m => ({ pageNumber: m.pageNumber, status: m.status })),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Single page manifest
router.get('/:chapterId/:pageNumber', verifyToken, async (req, res) => {
  try {
    const response = await databases.listDocuments(DB, PANEL_MANIFESTS, [
        Query.equal('chapterId', req.params.chapterId),
        Query.equal('pageNumber', parseInt(req.params.pageNumber))
    ]);
    
    if (response.documents.length === 0) {
        return res.status(404).json({ success: false, message: 'Manifest not found' });
    }
    
    let manifest = parseManifest(mapDoc(response.documents[0]));
    res.json({ success: true, data: manifest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * INSTANT PANEL DETECTION - Synchronous detection (no queue)
 * Returns detected panels immediately for quick feedback
 */
router.post('/:chapterId/:pageNumber/detect-instant',
  verifyToken,
  [
    body('imageUrl').isURL().withMessage('imageUrl must be a valid URL'),
    body('imageWidth').isInt({ min: 1 }).withMessage('imageWidth must be positive'),
    body('imageHeight').isInt({ min: 1 }).withMessage('imageHeight must be positive'),
    body('readingDirection').optional().isIn(['ltr', 'rtl']).withMessage('Invalid reading direction'),
    body('artStyle').optional().isIn(['standard', 'action', 'webtoon', 'auto']).withMessage('Invalid art style')
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;
    
    try {
      const { imageUrl, imageWidth, imageHeight, readingDirection = 'ltr', artStyle = 'auto' } = req.body;
      const { chapterId, pageNumber } = req.params;
      
      // Verify chapter exists and user has access
      const chapterDoc = await databases.getDocument(DB, CHAPTERS, chapterId);
      if (!chapterDoc) {
        return res.status(404).json({ success: false, message: 'Chapter not found' });
      }

      // Verify manga ownership
      const manga = await databases.getDocument(DB, MANGAS, chapterDoc.mangaId);
      if (!manga || manga.authorId !== req.user._id) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this manga' });
      }

      // Run detection synchronously
      const panelDetectionService = require('../services/panelDetectionService');
      const detectionResult = await panelDetectionService.detectPanels({
        manifestId: 'temp',
        imageUrl,
        readingDirection,
        artStyle
      });

      const pageNum = parseInt(pageNumber);
      const panels = detectionResult.panels.map((p, i) => normPanel(p, i, pageNum));

      // Get or create manifest
      const existRes = await databases.listDocuments(DB, PANEL_MANIFESTS, [
        Query.equal('chapterId', chapterId),
        Query.equal('pageNumber', pageNum)
      ]);

      let manifest;
      if (existRes.documents.length === 0) {
        manifest = await databases.createDocument(DB, PANEL_MANIFESTS, ID.unique(), {
          chapterId,
          mangaId: chapterDoc.mangaId,
          uploader: req.user._id,
          pageNumber: pageNum,
          imageUrl,
          imageWidth,
          imageHeight,
          readingDirection,
          artStyle,
          status: 'detected',
          detectedPanels: JSON.stringify(panels),
          panels: JSON.stringify(panels),
          detectionConfidence: detectionResult.confidence,
          detectionMethod: detectionResult.method,
          corrections: '[]'
        });
      } else {
        manifest = existRes.documents[0];
        await databases.updateDocument(DB, PANEL_MANIFESTS, manifest.$id, {
          status: 'detected',
          imageUrl,
          imageWidth,
          imageHeight,
          readingDirection,
          artStyle,
          detectedPanels: JSON.stringify(panels),
          panels: JSON.stringify(panels),
          detectionConfidence: detectionResult.confidence,
          detectionMethod: detectionResult.method
        });
      }

      res.json({
        success: true,
        message: 'Panels detected successfully',
        data: {
          manifestId: manifest.$id,
          panels: detectionResult.panels,
          confidence: detectionResult.confidence,
          panelCount: detectionResult.panels.length
        }
      });
    } catch (err) {
      console.error('[Panel Detection] Instant detection error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * DETECT PANELS - Queue-based panel detection
 * Initiates asynchronous panel detection process
 */
router.post('/:chapterId/:pageNumber/detect',
  verifyToken,
  [
    body('imageUrl').isURL().withMessage('imageUrl must be a valid URL'),
    body('imageWidth').isInt({ min: 1 }).withMessage('imageWidth must be positive'),
    body('imageHeight').isInt({ min: 1 }).withMessage('imageHeight must be positive'),
    body('readingDirection').optional().isIn(['ltr', 'rtl']).withMessage('Invalid reading direction'),
    body('artStyle').optional().isIn(['standard', 'action', 'webtoon', 'auto']).withMessage('Invalid art style')
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;
    
    try {
      const { imageUrl, imageWidth, imageHeight, readingDirection = 'ltr', artStyle = 'auto' } = req.body;
      const { chapterId, pageNumber } = req.params;
      
      // Verify chapter exists and user has access
      const chapterDoc = await databases.getDocument(DB, CHAPTERS, chapterId);
      if (!chapterDoc) {
        return res.status(404).json({ success: false, message: 'Chapter not found' });
      }

      // Verify manga ownership
      const manga = await databases.getDocument(DB, MANGAS, chapterDoc.mangaId);
      if (!manga || manga.authorId !== req.user._id) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this manga' });
      }

      // Get or create manifest
      const existRes = await databases.listDocuments(DB, PANEL_MANIFESTS, [
        Query.equal('chapterId', chapterId),
        Query.equal('pageNumber', parseInt(pageNumber))
      ]);

      let manifest;
      if (existRes.documents.length === 0) {
        // Create new manifest
        manifest = await databases.createDocument(DB, PANEL_MANIFESTS, ID.unique(), {
          chapterId,
          mangaId: chapterDoc.mangaId,
          uploader: req.user._id,
          pageNumber: parseInt(pageNumber),
          imageUrl,
          imageWidth,
          imageHeight,
          readingDirection,
          artStyle,
          status: 'pending_detection',
          detectedPanels: '[]',
          panels: '[]',
          detectionConfidence: 0,
          detectionMethod: 'pending',
          corrections: '[]'
        });
      } else {
        manifest = existRes.documents[0];
        // Update existing manifest
        await databases.updateDocument(DB, PANEL_MANIFESTS, manifest.$id, {
          status: 'pending_detection',
          imageUrl,
          imageWidth,
          imageHeight,
          readingDirection,
          artStyle
        });
      }

      // Queue panel detection job
      const job = await addPanelDetection({
        manifestId: manifest.$id,
        imageUrl,
        readingDirection,
        artStyle
      });

      res.json({
        success: true,
        message: 'Panel detection queued',
        data: {
          manifestId: manifest.$id,
          jobId: job.id,
          status: 'pending_detection'
        }
      });
    } catch (err) {
      console.error('[Panel Detection] Route error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Save corrected panels
router.put('/:chapterId/:pageNumber',
  verifyToken,
  [ body('panels').isArray({ min: 0 }).withMessage('panels must be an array') ],
  async (req, res) => {
    if (validationGuard(req, res)) return;
    const { panels } = req.body;

    try {
      const response = await databases.listDocuments(DB, PANEL_MANIFESTS, [
        Query.equal('chapterId', req.params.chapterId),
        Query.equal('pageNumber', parseInt(req.params.pageNumber))
      ]);
      
      if (response.documents.length === 0) return res.status(404).json({ success: false, message: 'Manifest not found' });
      const manifest = response.documents[0];

      // Validate & normalise each panel
      const normalised = panels.map((p, i) => {
        if (!p.bbox || typeof p.bbox.x !== 'number') {
          throw new Error(`Panel ${i} missing valid bbox`);
        }
        return normPanel(p, i, req.params.pageNumber);
      });

      // Re-sort by reading order
      normalised.sort((a, b) => a.readingOrder - b.readingOrder);

      const updated = await databases.updateDocument(DB, PANEL_MANIFESTS, manifest.$id, {
          panels: JSON.stringify(normalised),
          status: 'reviewing'
      });

      res.json({ success: true, data: parseManifest(mapDoc(updated)) });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// Confirm
router.post('/:chapterId/:pageNumber/confirm', verifyToken, async (req, res) => {
  try {
    const response = await databases.listDocuments(DB, PANEL_MANIFESTS, [
        Query.equal('chapterId', req.params.chapterId),
        Query.equal('pageNumber', parseInt(req.params.pageNumber))
    ]);
      
    if (response.documents.length === 0) return res.status(404).json({ success: false, message: 'Manifest not found' });
    const manifest = response.documents[0];
    
    // Check if panels exist
    let panels = [];
    if (typeof manifest.panels === 'string') {
        try { panels = JSON.parse(manifest.panels); } catch {}
    }

    if (panels.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot confirm a page with no panels' });
    }

    const updated = await databases.updateDocument(DB, PANEL_MANIFESTS, manifest.$id, {
        status: 'confirmed'
    });

    res.json({ success: true, data: { status: updated.status } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET DETECTION JOB STATUS
 */
router.get('/:manifestId/detection-status', verifyToken, async (req, res) => {
  try {
    const manifest = await databases.getDocument(DB, PANEL_MANIFESTS, req.params.manifestId);
    
    res.json({
      success: true,
      data: {
        status: manifest.status,
        detectionConfidence: manifest.detectionConfidence || 0,
        detectionMethod: manifest.detectionMethod || 'pending',
        detectionError: manifest.detectionError || null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * INSTANT DETECT CHARACTERS - Synchronous character detection
 */
router.post('/:chapterId/:pageNumber/detect-characters-instant',
  verifyToken,
  async (req, res) => {
    try {
      const { chapterId, pageNumber } = req.params;
      
      // Verify ownership
      const chapterDoc = await databases.getDocument(DB, CHAPTERS, chapterId);
      const manga = await databases.getDocument(DB, MANGAS, chapterDoc.mangaId);
      if (manga.authorId !== req.user._id) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      // Get manifest
      const manifestRes = await databases.listDocuments(DB, PANEL_MANIFESTS, [
        Query.equal('chapterId', chapterId),
        Query.equal('pageNumber', parseInt(pageNumber))
      ]);

      if (manifestRes.documents.length === 0) {
        return res.status(404).json({ success: false, message: 'Manifest not found' });
      }

      const manifest = manifestRes.documents[0];
      const pageNum = parseInt(pageNumber);
      const panels = JSON.parse(manifest.panels || '[]');
      
      const characterDetectionService = require('../services/characterDetectionService');
      const results = {};

      for (const panel of panels) {
        // Ensure panelId is unique even if loading from old manifest
        if (!panel.panelId.startsWith(`p${pageNum}_`)) {
          panel.panelId = `p${pageNum}_${panel.panelId}`;
        }

        const detection = await characterDetectionService.detectCharacters({
          manifestId: manifest.$id,
          panelId: panel.panelId,
          imageUrl: manifest.imageUrl,
          bbox: panel.bbox
        });
        
        if (detection.success) {
          results[panel.panelId] = (detection.detectedCharacters || []).map(c => ({
            ...c,
            characterId: null // initially untagged
          }));
        }
      }

      res.json({
        success: true,
        message: 'Characters detected successfully',
        data: results
      });
    } catch (err) {
      console.error('[Character Detection] Instant error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * DETECT CHARACTERS - Queue-based character detection
 */
router.post('/:chapterId/:pageNumber/detect-characters',
  verifyToken,
  async (req, res) => {
    try {
      const { chapterId, pageNumber } = req.params;
      
      // Verify ownership
      const chapterDoc = await databases.getDocument(DB, CHAPTERS, chapterId);
      const manga = await databases.getDocument(DB, MANGAS, chapterDoc.mangaId);
      if (manga.authorId !== req.user._id) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      // Get manifest
      const manifestRes = await databases.listDocuments(DB, PANEL_MANIFESTS, [
        Query.equal('chapterId', chapterId),
        Query.equal('pageNumber', parseInt(pageNumber))
      ]);

      if (manifestRes.documents.length === 0) {
        return res.status(404).json({ success: false, message: 'Manifest not found' });
      }

      const manifest = manifestRes.documents[0];
      let panels = [];
      try {
        panels = typeof manifest.panels === 'string' ? JSON.parse(manifest.panels) : manifest.panels;
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid panels data' });
      }

      // Queue character detection for each panel
      const jobs = [];
      for (const panel of panels) {
        const job = await addCharacterDetection({
          manifestId: manifest.$id,
          panelId: panel.panelId,
          imageUrl: manifest.imageUrl,
          bbox: panel.bbox
        });
        jobs.push(job);
      }

      res.json({
        success: true,
        message: 'Character detection queued',
        data: {
          manifestId: manifest.$id,
          jobCount: jobs.length,
          jobIds: jobs.map(j => j.id)
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * EXTRACT TEXT FROM SPEECH BUBBLES - Queue-based OCR
 */
router.post('/:chapterId/:pageNumber/extract-text',
  verifyToken,
  [
    body('language').optional().isLength({ min: 2, max: 5 })
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;
    
    try {
      const { chapterId, pageNumber } = req.params;
      const { language = 'eng' } = req.body;
      
      // Verify ownership
      const chapterDoc = await databases.getDocument(DB, CHAPTERS, chapterId);
      const manga = await databases.getDocument(DB, MANGAS, chapterDoc.mangaId);
      if (manga.authorId !== req.user._id) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      // Get manifest
      const manifestRes = await databases.listDocuments(DB, PANEL_MANIFESTS, [
        Query.equal('chapterId', chapterId),
        Query.equal('pageNumber', parseInt(pageNumber))
      ]);

      if (manifestRes.documents.length === 0) {
        return res.status(404).json({ success: false, message: 'Manifest not found' });
      }

      const manifest = manifestRes.documents[0];
      let panels = [];
      try {
        panels = typeof manifest.panels === 'string' ? JSON.parse(manifest.panels) : manifest.panels;
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid panels data' });
      }

      // Queue OCR for each panel with speech bubbles
      const jobs = [];
      for (const panel of panels) {
        if (panel.speechBubbles && panel.speechBubbles.length > 0) {
          const job = await addOCR({
            manifestId: manifest.$id,
            panelId: panel.panelId,
            speechBubbles: panel.speechBubbles,
            imageUrl: manifest.imageUrl,
            language
          });
          jobs.push(job);
        }
      }

      res.json({
        success: true,
        message: 'OCR queued',
        data: {
          manifestId: manifest.$id,
          jobCount: jobs.length,
          jobIds: jobs.map(j => j.id)
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * GENERATE VOICES - Queue-based TTS
 */
router.post('/:chapterId/:pageNumber/generate-voices',
  verifyToken,
  async (req, res) => {
    try {
      const { chapterId, pageNumber } = req.params;
      
      // Verify ownership
      const chapterDoc = await databases.getDocument(DB, CHAPTERS, chapterId);
      const manga = await databases.getDocument(DB, MANGAS, chapterDoc.mangaId);
      if (manga.authorId !== req.user._id) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      // Get manifest
      const manifestRes = await databases.listDocuments(DB, PANEL_MANIFESTS, [
        Query.equal('chapterId', chapterId),
        Query.equal('pageNumber', parseInt(pageNumber))
      ]);

      if (manifestRes.documents.length === 0) {
        return res.status(404).json({ success: false, message: 'Manifest not found' });
      }

      const manifest = manifestRes.documents[0];
      let panels = [];
      try {
        panels = typeof manifest.panels === 'string' ? JSON.parse(manifest.panels) : manifest.panels;
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid panels data' });
      }

      // Queue TTS for each panel with speech bubbles
      const jobs = [];
      for (const panel of panels) {
        if (panel.speechBubbles && panel.speechBubbles.length > 0) {
          const job = await addTTS({
            manifestId: manifest.$id,
            panelId: panel.panelId,
            speechBubbles: panel.speechBubbles,
            imageUrl: manifest.imageUrl
          });
          jobs.push(job);
        }
      }

      res.json({
        success: true,
        message: 'Voice generation queued',
        data: {
          manifestId: manifest.$id,
          jobCount: jobs.length,
          jobIds: jobs.map(j => j.id)
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * ASSIGN CHARACTER TO SPEECH BUBBLE
 */
router.put('/:chapterId/:pageNumber/assign-character',
  verifyToken,
  [
    body('bubbleId').notEmpty(),
    body('characterId').notEmpty()
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;
    
    try {
      const { chapterId, pageNumber } = req.params;
      const { bubbleId, characterId } = req.body;

      // Get manifest
      const manifestRes = await databases.listDocuments(DB, PANEL_MANIFESTS, [
        Query.equal('chapterId', chapterId),
        Query.equal('pageNumber', parseInt(pageNumber))
      ]);

      if (manifestRes.documents.length === 0) {
        return res.status(404).json({ success: false, message: 'Manifest not found' });
      }

      const manifest = manifestRes.documents[0];
      let panels = [];
      try {
        panels = typeof manifest.panels === 'string' ? JSON.parse(manifest.panels) : manifest.panels;
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid panels data' });
      }

      // Find and update the speech bubble
      let found = false;
      for (const panel of panels) {
        if (panel.speechBubbles) {
          const bubble = panel.speechBubbles.find(b => b.bubbleId === bubbleId);
          if (bubble) {
            bubble.speakerId = characterId;
            found = true;
            break;
          }
        }
      }

      if (!found) {
        return res.status(404).json({ success: false, message: 'Speech bubble not found' });
      }

      // Update manifest
      await databases.updateDocument(DB, PANEL_MANIFESTS, manifest.$id, {
        panels: JSON.stringify(panels)
      });

      res.json({
        success: true,
        message: 'Character assigned to speech bubble',
        data: { bubbleId, characterId }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * RESET TO DETECTED PANELS
 */
router.post('/:chapterId/:pageNumber/reset', verifyToken, async (req, res) => {
  try {
    const response = await databases.listDocuments(DB, PANEL_MANIFESTS, [
      Query.equal('chapterId', req.params.chapterId),
      Query.equal('pageNumber', parseInt(req.params.pageNumber))
    ]);
      
    if (response.documents.length === 0) {
      return res.status(404).json({ success: false, message: 'No detection data found' });
    }
    
    const manifest = response.documents[0];

    const updated = await databases.updateDocument(DB, PANEL_MANIFESTS, manifest.$id, {
      panels: manifest.detectedPanels || '[]',
      status: 'detected'
    });

    res.json({ success: true, data: parseManifest(mapDoc(updated)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
