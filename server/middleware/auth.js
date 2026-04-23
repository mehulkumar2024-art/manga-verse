const { Client, Account, Databases, Query } = require('node-appwrite');
const { databases } = require('../config/appwrite');

// We create a temporary client just for JWT verification
const verifyAppwriteToken = async (token) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setJWT(token);
    const account = new Account(client);
    return await account.get(); // Returns the Appwrite user profile
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // For local development mock user
    if (process.env.NODE_ENV === 'development' && (!authHeader || authHeader === 'Bearer mock_token')) {
        try {
            const devUsers = await databases.listDocuments('mangaverse', 'users', [
                Query.equal('username', 'dev_user')
            ]);
            
            let user;
            if (devUsers.documents.length === 0) {
                user = await databases.createDocument('mangaverse', 'users', 'unique()', {
                    uid: 'mock_uid_123',
                    email: 'dev@mangaverse.com',
                    username: 'dev_user',
                    displayName: 'Developer',
                    isArtist: true
                });
            } else {
                user = devUsers.documents[0];
            }
            req.user = user;
            req.appwriteUser = { $id: user.uid, email: user.email };
            return next();
        } catch (e) {
            console.error('Mock dev user creation failed:', e);
            // Fallback gracefully
        }
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await verifyAppwriteToken(token);

    // Find user in Appwrite Database
    const userDocs = await databases.listDocuments('mangaverse', 'users', [
        Query.equal('uid', decoded.$id)
    ]);
    
    if (userDocs.documents.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const { mapDoc } = require('../utils/appwriteMapper');
    req.user = mapDoc(userDocs.documents[0]);
    req.appwriteUser = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decoded = await verifyAppwriteToken(token);
      
      const userDocs = await databases.listDocuments('mangaverse', 'users', [
          Query.equal('uid', decoded.$id)
      ]);
      
      if (userDocs.documents.length > 0) {
        const { mapDoc } = require('../utils/appwriteMapper');
        req.user = mapDoc(userDocs.documents[0]);
        req.appwriteUser = decoded;
      }
    }
    next();
  } catch {
    next();
  }
};

/**
 * Check if user owns a resource (manga, chapter, etc)
 */
const checkOwnership = async (userId, resourceId, resourceCollection) => {
  try {
    const resource = await databases.getDocument('mangaverse', resourceCollection, resourceId);
    return resource.uploader === userId || resource.author === userId;
  } catch {
    return false;
  }
};

/**
 * Middleware to verify ownership
 */
const verifyOwnership = (resourceField = 'resourceId', collection = null) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceField];
      if (!resourceId || !collection) {
        return res.status(400).json({ success: false, message: 'Missing resource identifier' });
      }

      const isOwner = await checkOwnership(req.user._id, resourceId, collection);
      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this resource' });
      }

      next();
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  };
};

module.exports = { 
  authenticate, 
  verifyToken: authenticate, 
  optionalAuth,
  checkOwnership,
  verifyOwnership
};
