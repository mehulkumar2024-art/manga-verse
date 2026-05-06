const express = require('express');
const router = express.Router();
const { ID, Query } = require('node-appwrite');
const { databases } = require('../config/appwrite');
const { uploadPages, uploadToAppwrite } = require('../config/upload');
const { authenticate } = require('../middleware/auth');
const { mapDoc } = require('../utils/appwriteMapper');

const DB = 'mangaverse';
const CHAPTERS = 'chapters';
const MANGAS = 'mangas';
const USERS = 'users';

// Get chapter
router.get('/:id', async (req, res) => {
  try {
    const doc = await databases.getDocument(DB, CHAPTERS, req.params.id);
    let chapter = mapDoc(doc);

    // Fetch Manga to populate
    try {
      const mangaDoc = await databases.getDocument(DB, MANGAS, chapter.mangaId);
      let manga = mapDoc(mangaDoc);

      try {
        const chaptersRes = await databases.listDocuments(DB, CHAPTERS, [
          Query.equal('mangaId', manga._id),
          Query.orderAsc('chapterNumber')
        ]);
        manga.chapters = chaptersRes.documents.map(mapDoc);
      } catch (err) {
        manga.chapters = [];
      }
      
      // Populate author
      try {
        const authorDoc = await databases.getDocument(DB, USERS, manga.authorId);
        manga.author = mapDoc(authorDoc);
      } catch {
        manga.author = null;
      }
      chapter.manga = manga;
    } catch {
      chapter.manga = null;
    }

    if (!chapter) return res.status(404).json({ success: false, message: 'Chapter not found' });

    // Increment views
    await databases.updateDocument(DB, CHAPTERS, chapter._id, { views: (chapter.views || 0) + 1 });
    
    if (typeof chapter.pages === 'string') {
      try {
        chapter.pages = JSON.parse(chapter.pages);
      } catch (e) {
        chapter.pages = [];
      }
    }

    res.json({ success: true, chapter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload chapter with pages
router.post('/', authenticate, uploadPages, async (req, res) => {
  try {
    const { mangaId, chapterNumber, title } = req.body;

    // Verify ownership
    const mangaDoc = await databases.getDocument(DB, MANGAS, mangaId);
    if (!mangaDoc) return res.status(404).json({ success: false, message: 'Manga not found' });
    if (mangaDoc.authorId !== req.user._id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Process uploaded pages
    let pages = [];
    if (req.files && req.files.length > 0) {
      const sortedFiles = req.files.sort((a, b) => a.originalname.localeCompare(b.originalname));
      
      const uploadPromises = sortedFiles.map((file, index) => {
        return uploadToAppwrite('pages', file.buffer, file.originalname, file.mimetype)
          .then(res => ({
            url: res.url,
            publicId: res.publicId,
            pageNumber: index + 1
          }));
      });
      pages = await Promise.all(uploadPromises);
    } else if (typeof req.body.pages === 'string') {
      try {
        pages = JSON.parse(req.body.pages);
      } catch {
        pages = [];
      }
    } else if (Array.isArray(req.body.pages)) {
        pages = req.body.pages;
    }

    if (!pages || pages.length === 0) {
      return res.status(400).json({ success: false, message: 'No pages uploaded' });
    }

    const newChapterData = {
      mangaId,
      chapterNumber: parseInt(chapterNumber),
      title: title || `Chapter ${chapterNumber}`,
      pages: JSON.stringify(pages), // Store as JSON string in Appwrite
      views: 0
    };

    const chapterDoc = await databases.createDocument(DB, CHAPTERS, ID.unique(), newChapterData);
    let chapter = mapDoc(chapterDoc);
    
    // Create panel manifests for each page - MUST succeed or rollback chapter
    const PANEL_MANIFESTS = 'panel_manifests';
    const manifestPromises = pages.map(page => {
      return databases.createDocument(DB, PANEL_MANIFESTS, ID.unique(), {
        chapterId: chapter._id,
        mangaId: mangaId,
        pageNumber: page.pageNumber,
        imageUrl: page.url,
        status: 'pending_detection',
        panels: '[]',
        detectedPanels: '[]',
        corrections: '[]',
        uploader: req.user._id,
        imageWidth: 800, // Default, will be updated during detection
        imageHeight: 1100,
        readingDirection: req.body.readingDirection || 'ltr',
        artStyle: req.body.artStyle || 'auto',
        detectionConfidence: 0,
        detectionMethod: 'pending'
      });
    });

    try {
      const manifestDocs = await Promise.all(manifestPromises);
      console.log(`✓ Created ${manifestDocs.length} panel manifests for chapter ${chapter._id}`);
    } catch (err) {
      // Rollback: delete the chapter since manifest creation failed
      console.error('Failed to create panel manifests:', err);
      try {
        await databases.deleteDocument(DB, CHAPTERS, chapter._id);
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create chapter structure. Please try again.',
        error: err.message 
      });
    }

    // Convert pages string back to array for response
    chapter.pages = JSON.parse(chapter.pages);

    res.status(201).json({ success: true, chapter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete chapter
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const chapter = await databases.getDocument(DB, CHAPTERS, req.params.id);
    if (!chapter) return res.status(404).json({ success: false, message: 'Chapter not found' });
    
    const manga = await databases.getDocument(DB, MANGAS, chapter.mangaId);
    if (manga.authorId !== req.user._id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await databases.deleteDocument(DB, CHAPTERS, req.params.id);
    res.json({ success: true, message: 'Chapter deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
