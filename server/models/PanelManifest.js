// models/PanelManifest.js
// Stores the panel detection results + any manual corrections for a chapter page.
// One document per PAGE (not per chapter) so corrections are granular.

const mongoose = require('mongoose');

const BoundingBoxSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  w: { type: Number, required: true },
  h: { type: Number, required: true },
}, { _id: false });

const SpeechBubbleSchema = new mongoose.Schema({
  bubbleId:   { type: String, required: true },
  shape:      { type: String, enum: ['oval','rectangle','jagged','thought'], default: 'oval' },
  bbox:       { type: BoundingBoxSchema, required: true },
  textRegion: { type: BoundingBoxSchema },
  ocrText:    { type: String, default: '' },
  speakerId:  { type: String, default: null }, // character._id reference (string)
}, { _id: false });

const ContentZoneSchema = new mongoose.Schema({
  zoneType:   { type: String, enum: ['character_face','character_body','background','action','text'] },
  bbox:       { type: BoundingBoxSchema },
  confidence: { type: Number, min: 0, max: 1, default: 0.5 },
}, { _id: false });

const PanelSchema = new mongoose.Schema({
  panelId:          { type: String, required: true },   // e.g. "p01_panel_02"
  readingOrder:     { type: Number, required: true },   // 0-indexed
  label:            { type: String, default: '' },
  bbox:             { type: BoundingBoxSchema, required: true },
  panelType:        { type: String, enum: ['bordered','borderless','bleed','diagonal'], default: 'bordered' },
  colorTag:         { type: String, default: '#e8341a' }, // editor colour for this panel
  speechBubbles:    { type: [SpeechBubbleSchema], default: [] },
  contentZones:     { type: [ContentZoneSchema],  default: [] },
  suggestedCamera:  { type: String, default: 'static' },
  emotionalIntensity: { type: Number, min: 0, max: 1, default: 0 },
}, { _id: false });

const PanelManifestSchema = new mongoose.Schema({
  chapter:     { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true, index: true },
  manga:       { type: mongoose.Schema.Types.ObjectId, ref: 'Manga',   required: true, index: true },
  uploader:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },

  pageNumber:       { type: Number, required: true },
  imageUrl:         { type: String, required: true },  // Cloudinary URL of the page image
  imagePublicId:    { type: String },                  // Cloudinary public_id for transformations
  imageWidth:       { type: Number },
  imageHeight:      { type: Number },

  readingDirection: { type: String, enum: ['rtl','ltr'], default: 'rtl' },
  artStyle:         { type: String, enum: ['standard','action','webtoon','auto'], default: 'auto' },

  // Auto-detected panels (never overwritten once set — source of truth for reset)
  detectedPanels:   { type: [PanelSchema], default: [] },

  // Current state (may be manually corrected)
  panels:           { type: [PanelSchema], default: [] },

  // Review state
  status: {
    type: String,
    enum: ['pending_detection','detecting','detected','reviewing','confirmed','error'],
    default: 'pending_detection',
    index: true,
  },
  detectionConfidence: { type: Number, min: 0, max: 1, default: 0 },
  detectionMethod:     { type: String, default: 'classical_cv' },
  detectionError:      { type: String, default: null },

  // Track when uploader confirmed this page
  confirmedAt: { type: Date, default: null },

  // Correction audit log
  corrections: [{
    at:          { type: Date, default: Date.now },
    action:      { type: String }, // 'add','delete','move','resize','reorder','split','merge','reset'
    description: { type: String },
  }],

}, {
  timestamps: true,
});

// Compound unique: one manifest per page per chapter
PanelManifestSchema.index({ chapter: 1, pageNumber: 1 }, { unique: true });

// Virtual: how many panels confirmed
PanelManifestSchema.virtual('panelCount').get(function() {
  return this.panels.length;
});

// Helper: reset panels to the original detected set
PanelManifestSchema.methods.resetToDetected = function() {
  this.panels = this.detectedPanels.map(p => ({ ...p.toObject() }));
  this.corrections.push({ action: 'reset', description: 'Reset to auto-detected panels' });
};

module.exports = mongoose.model('PanelManifest', PanelManifestSchema);
