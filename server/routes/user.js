const express = require('express');
const router = express.Router();
const { ID, Query } = require('node-appwrite');
const { databases } = require('../config/appwrite');
const { uploadAvatar, uploadToAppwrite } = require('../config/upload');
const { authenticate } = require('../middleware/auth');
const { mapDoc, mapList } = require('../utils/appwriteMapper');

const DB = 'mangaverse';
const USERS = 'users';
const MANGAS = 'mangas';
const CHAPTERS = 'chapters';

// Get user profile
router.get('/:username', async (req, res) => {
  try {
    const userRes = await databases.listDocuments(DB, USERS, [
      Query.equal('username', req.params.username)
    ]);
    
    if (userRes.documents.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const userDoc = userRes.documents[0];
    
    const mangaRes = await databases.listDocuments(DB, MANGAS, [
      Query.equal('authorId', userDoc.$id),
      Query.orderDesc('$createdAt')
    ]);

    const user = mapDoc(userDoc);
    // Remove sensitive info
    delete user.uid;
    delete user.savedManga;
    delete user.likedManga;

    res.json({ success: true, user, manga: mapList(mangaRes) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update profile
router.put('/me/profile', authenticate, uploadAvatar, async (req, res) => {
  try {
    const updates = {};
    if (req.body.displayName) updates.displayName = req.body.displayName;
    if (req.body.bio) updates.bio = req.body.bio;
    
    if (req.file) {
      const uploadRes = await uploadToAppwrite('avatars', req.file.buffer, req.file.originalname, req.file.mimetype);
      updates.avatar = uploadRes.url;
    }

    const updatedUser = await databases.updateDocument(DB, USERS, req.user._id, updates);
    res.json({ success: true, user: mapDoc(updatedUser) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper to fetch manga by IDs
async function getMangasByIds(ids) {
  if (!ids || ids.length === 0) return [];
  try {
    // Appwrite doesn't have an 'in' query for document IDs easily, so we fetch individually or use equal if few.
    // Given the limit of Appwrite 'equal' with array of strings, it might work, but manual fetch is safer if small.
    // Actually `Query.equal('$id', ids)` is supported if ids is an array!
    const response = await databases.listDocuments(DB, MANGAS, [
      Query.equal('$id', ids)
    ]);
    return mapList(response);
  } catch {
    return [];
  }
}

// Get library (saved manga)
router.get('/me/library', authenticate, async (req, res) => {
  try {
    const userDoc = await databases.getDocument(DB, USERS, req.user._id);
    const savedMangaIds = userDoc.savedManga || [];
    const likedMangaIds = userDoc.likedManga || [];

    const saved = await getMangasByIds(savedMangaIds);
    const liked = await getMangasByIds(likedMangaIds);

    // To populate author:
    const populateAuthor = async (manga) => {
      try {
        if (!manga.authorId) return manga;
        const author = await databases.getDocument(DB, USERS, manga.authorId);
        manga.author = { username: author.username, displayName: author.displayName };
      } catch {
        manga.author = null;
      }
      return manga;
    };

    const populatedSaved = await Promise.all(saved.map(populateAuthor));
    const populatedLiked = await Promise.all(liked.map(populateAuthor));

    res.json({ success: true, saved: populatedSaved, liked: populatedLiked });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's uploaded manga
router.get('/me/uploads', authenticate, async (req, res) => {
  try {
    const response = await databases.listDocuments(DB, MANGAS, [
      Query.equal('authorId', req.user._id),
      Query.orderDesc('$createdAt')
    ]);
    
    let mangas = mapList(response);
    
    // Populate chapters
    mangas = await Promise.all(mangas.map(async (m) => {
      try {
        const cRes = await databases.listDocuments(DB, CHAPTERS, [
          Query.equal('mangaId', m._id)
        ]);
        m.chapters = mapList(cRes);
      } catch {
        m.chapters = [];
      }
      return m;
    }));

    res.json({ success: true, manga: mangas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Follow/unfollow user
router.post('/:id/follow', authenticate, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    const targetUser = await databases.getDocument(DB, USERS, targetUserId);
    const currentUser = await databases.getDocument(DB, USERS, currentUserId);

    let following = currentUser.following || [];
    let followers = targetUser.followers || [];

    const isFollowing = following.includes(targetUserId);

    if (isFollowing) {
      following = following.filter(id => id !== targetUserId);
      followers = followers.filter(id => id !== currentUserId);
    } else {
      following = [...following, targetUserId];
      followers = [...followers, currentUserId];
    }

    await databases.updateDocument(DB, USERS, currentUserId, { following });
    await databases.updateDocument(DB, USERS, targetUserId, { followers });

    res.json({ success: true, following: !isFollowing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
