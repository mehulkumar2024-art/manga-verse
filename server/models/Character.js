// models/Character.js
// A character belongs to a Manga series (not a single chapter).
// Characters accumulate across chapters and get assigned voices + panel appearances.

const mongoose = require('mongoose');

const CharacterSchema = new mongoose.Schema({
  manga:    { type: mongoose.Schema.Types.ObjectId, ref: 'Manga', required: true, index: true },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },

  name:        { type: String, required: true, trim: true },
  aliases:     { type: [String], default: [] },   // alternate names / nicknames
  colorTag:    { type: String, default: '#9b6bdc' }, // UI identification colour
  avatarUrl:   { type: String, default: null },    // optional cropped face image

  // Voice assignment
  voiceType: {
    type: String,
    enum: ['male_young','male_adult','male_old','female_young','female_adult','female_old','child','robot','neutral'],
    default: 'male_young',
  },
  voiceId:     { type: String, default: null },    // ElevenLabs / TTS voice ID once assigned
  voiceName:   { type: String, default: null },    // human-readable voice label

  // Which panels this character appears in (across all chapters)
  // Stored as { chapterId, pageNumber, panelId }
  appearances: [{
    chapter:     { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
    pageNumber:  { type: Number },
    panelId:     { type: String },
  }],

  isMainCharacter: { type: Boolean, default: false },
  notes:           { type: String, default: '' },

}, { timestamps: true });

CharacterSchema.index({ manga: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Character', CharacterSchema);
