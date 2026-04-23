const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  manga: { type: mongoose.Schema.Types.ObjectId, ref: 'Manga', required: true },
  chapterNumber: { type: Number, required: true },
  title: { type: String, trim: true, default: '' },
  
  pages: [{
    url: { type: String, required: true },
    publicId: { type: String },
    pageNumber: { type: Number, required: true }
  }],
  
  views: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true },
  
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

chapterSchema.index({ manga: 1, chapterNumber: 1 });

module.exports = mongoose.model('Chapter', chapterSchema);
