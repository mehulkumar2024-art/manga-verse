const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true }, // Firebase UID
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true, trim: true },
  displayName: { type: String, trim: true },
  avatar: { type: String, default: '' },
  bio: { type: String, maxlength: 500, default: '' },
  isArtist: { type: Boolean, default: false },
  
  // Library
  savedManga: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Manga' }],
  likedManga: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Manga' }],
  readingHistory: [{
    manga: { type: mongoose.Schema.Types.ObjectId, ref: 'Manga' },
    chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
    lastRead: { type: Date, default: Date.now }
  }],
  
  // Social
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  emailVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
