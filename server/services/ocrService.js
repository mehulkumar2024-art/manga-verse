/**
 * OCR (Optical Character Recognition) Service
 * Extracts text from speech bubbles and other text regions in manga panels
 * Uses Tesseract.js for multi-language support
 */

const Tesseract = require('tesseract.js');
const fetch = require('node-fetch');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

let ocrWorker = null;

/**
 * Initialize OCR worker (Tesseract)
 */
async function initializeOCRWorker() {
  if (ocrWorker) return ocrWorker;
  
  console.log('[OCR] Initializing Tesseract worker...');
  ocrWorker = await Tesseract.createWorker({
    logger: m => {
      if (m.status === 'recognizing') {
        console.log(`[OCR] Recognition progress: ${Math.round(m.progress * 100)}%`);
      }
    },
    langPath: 'https://tessdata.projectnaptha.com/4.0_best'
  });
  
  // Load languages (English + Japanese for manga)
  await ocrWorker.loadLanguage('eng');
  await ocrWorker.initialize('eng');
  
  console.log('[OCR] Tesseract worker ready');
  return ocrWorker;
}

/**
 * Extract text from a speech bubble region
 */
async function extractTextFromBubble({ manifestId, panelId, bubbleId, bubbleBbox, imageUrl, language = 'eng' }) {
  try {
    console.log(`[OCR] Extracting text from bubble ${bubbleId}`);
    
    // Initialize worker
    const worker = await initializeOCRWorker();
    
    // Fetch and crop the speech bubble region from the image
    const imageBuffer = await fetch(imageUrl).then(r => r.buffer());
    
    // Crop to speech bubble area with padding for better recognition
    const padding = 5;
    const croppedBuffer = await sharp(imageBuffer)
      .extract({
        left: Math.max(0, bubbleBbox.x - padding),
        top: Math.max(0, bubbleBbox.y - padding),
        width: bubbleBbox.w + padding * 2,
        height: bubbleBbox.h + padding * 2
      })
      .png()
      .toBuffer();
    
    // Preprocess image for better OCR
    const processedBuffer = await sharp(croppedBuffer)
      .contrast()
      .sharpen()
      .toBuffer();
    
    // Convert to base64 for Tesseract
    const base64Image = processedBuffer.toString('base64');
    const imageData = `data:image/png;base64,${base64Image}`;
    
    // Run OCR
    const { data } = await worker.recognize(imageData);
    
    const extractedText = data.text.trim();
    const confidence = parseFloat((data.confidence / 100).toFixed(2));
    
    console.log(`[OCR] Extracted: "${extractedText.substring(0, 50)}..." (confidence: ${confidence})`);
    
    return {
      success: true,
      manifestId,
      panelId,
      bubbleId,
      ocrId: `ocr_${uuidv4().substring(0, 8)}`,
      extractedText,
      confidence,
      language,
      rawData: {
        fullText: data.text,
        allWords: data.words.map(w => ({
          text: w.text,
          confidence: w.confidence,
          bbox: w.bbox
        }))
      },
      processedAt: new Date()
    };
  } catch (err) {
    console.error('[OCR] Error:', err);
    throw new Error(`OCR extraction failed: ${err.message}`);
  }
}

/**
 * Extract text from all speech bubbles in a panel
 */
async function extractTextFromPanel({ manifestId, panelId, speechBubbles, imageUrl, language = 'eng' }) {
  try {
    console.log(`[OCR] Extracting text from ${speechBubbles.length} bubbles in panel ${panelId}`);
    
    const results = [];
    
    for (const bubble of speechBubbles) {
      try {
        const result = await extractTextFromBubble({
          manifestId,
          panelId,
          bubbleId: bubble.bubbleId,
          bubbleBbox: bubble.textRegion || bubble.bbox,
          imageUrl,
          language
        });
        results.push(result);
      } catch (err) {
        console.error(`[OCR] Failed to extract from bubble ${bubble.bubbleId}:`, err.message);
        results.push({
          bubbleId: bubble.bubbleId,
          success: false,
          error: err.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`[OCR] Completed: ${successCount}/${speechBubbles.length} bubbles`);
    
    return {
      success: true,
      manifestId,
      panelId,
      results,
      processedAt: new Date()
    };
  } catch (err) {
    console.error('[OCR] Panel extraction error:', err);
    throw new Error(`Panel OCR failed: ${err.message}`);
  }
}

/**
 * Terminate OCR worker to free resources
 */
async function terminateOCRWorker() {
  if (ocrWorker) {
    await ocrWorker.terminate();
    ocrWorker = null;
    console.log('[OCR] Worker terminated');
  }
}

module.exports = {
  extractTextFromBubble,
  extractTextFromPanel,
  extractText: extractTextFromPanel, // Alias for queue processor
  initializeOCRWorker,
  terminateOCRWorker
};
