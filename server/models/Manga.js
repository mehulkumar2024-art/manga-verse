const mongoose = require('mongoose');

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports',
  'Supernatural', 'Thriller', 'Historical', 'Isekai', 'Mecha',
  'Psychological', 'Shounen', 'Shoujo', 'Seinen', 'Josei'
];

const STATUS = ['Ongoing', 'Completed', 'Hiatus', 'Cancelled'];

const mangaSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, maxlength: 2000 },
  coverImage: { type: String, required: true },
  coverImagePublicId: { type: String },
  
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  genres: [{
    type: String,
    enum: GENRES
  }],
  
  status: { type: String, enum: STATUS, default: 'Ongoing' },
  
  chapters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }],
  
  // Stats
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  saves: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  
  tags: [String],
  language: { type: String, default: 'English' },
  isPublished: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

mangaSchema.index({ title: 'text', description: 'text', tags: 'text' });
mangaSchema.index({ genres: 1 });
mangaSchema.index({ views: -1 });
mangaSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Manga', mangaSchema);
module.exports.GENRES = GENRES;
module.exports.STATUS = STATUS;
