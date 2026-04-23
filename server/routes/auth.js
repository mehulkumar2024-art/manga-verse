const express = require('express');
const router = express.Router();
const { ID, Query, Client, Account } = require('node-appwrite');
const { databases } = require('../config/appwrite');
const { authenticate } = require('../middleware/auth');
const { mapDoc } = require('../utils/appwriteMapper');

const DB = 'mangaverse';
const USERS = 'users';

// Helper to verify Appwrite JWT
const verifyAppwriteToken = async (token) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setJWT(token);
    const account = new Account(client);
    return await account.get(); // Returns the Appwrite user profile
};

// Register/sync user after Appwrite Auth
router.post('/register', async (req, res) => {
  try {
    const { idToken, username, displayName } = req.body;

    if (!idToken || !username) {
      return res.status(400).json({ success: false, message: 'Token and username required' });
    }

    // Verify Appwrite token
    let decoded;
    try {
        decoded = await verifyAppwriteToken(idToken);
    } catch (e) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Check username availability
    const existingUsername = await databases.listDocuments(DB, USERS, [
        Query.equal('username', username.toLowerCase())
    ]);
    if (existingUsername.documents.length > 0) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    // Check if user already exists in DB
    const existingUser = await databases.listDocuments(DB, USERS, [
        Query.equal('uid', decoded.$id)
    ]);
    if (existingUser.documents.length > 0) {
      return res.status(200).json({ success: true, user: mapDoc(existingUser.documents[0]) });
    }

    // Create new user in DB
    const newUser = {
      uid: decoded.$id,
      email: decoded.email,
      username: username.toLowerCase(),
      displayName: displayName || username,
      emailVerified: decoded.emailVerification,
    };

    const created = await databases.createDocument(DB, USERS, ID.unique(), newUser);
    res.status(201).json({ success: true, user: mapDoc(created) });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login - sync and return user data
router.post('/login', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ success: false, message: 'Token required' });

    let decoded;
    try {
        decoded = await verifyAppwriteToken(idToken);
    } catch (e) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const userDocs = await databases.listDocuments(DB, USERS, [
        Query.equal('uid', decoded.$id)
    ]);

    if (userDocs.documents.length === 0) {
      return res.status(404).json({ success: false, message: 'User not registered', needsRegistration: true });
    }

    let user = userDocs.documents[0];

    // Update email verified status
    if (user.emailVerified !== decoded.emailVerification) {
      user = await databases.updateDocument(DB, USERS, user.$id, {
          emailVerified: decoded.emailVerification
      });
    }

    res.json({ success: true, user: mapDoc(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    // req.user is populated by authenticate middleware
    // We don't populate savedManga and likedManga here fully to save bandwidth, 
    // it's just a profile check. The library route handles full populating.
    const userDoc = await databases.getDocument(DB, USERS, req.user._id);
    res.json({ success: true, user: mapDoc(userDoc) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check username availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const userDocs = await databases.listDocuments(DB, USERS, [
        Query.equal('username', req.params.username.toLowerCase())
    ]);
    res.json({ available: userDocs.documents.length === 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
