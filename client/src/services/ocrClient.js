/**
 * Client-Side OCR Service
 * Extracts text from speech bubbles using Tesseract.js
 * Provides instant preview and manual correction UI
 */

import Tesseract from 'tesseract.js';

let ocrWorker = null;

/**
 * Initialize OCR worker
 */
export async function initializeOCR() {
  if (ocrWorker) return ocrWorker;
  
  console.log('[OCR] Initializing Tesseract worker...');
  
  try {
    ocrWorker = await Tesseract.createWorker({
      logger: (m) => {
        if (m.status === 'recognizing') {
          // Emit progress event
          window.dispatchEvent(
            new CustomEvent('ocr-progress', { 
              detail: { progress: m.progress, text: 'Recognizing text...' } 
            })
          );
        }
      },
      langPath: 'https://tessdata.projectnaptha.com/4.0_best'
    });

    await ocrWorker.loadLanguage('eng');
    await ocrWorker.initialize('eng');
    
    console.log('[OCR] Worker ready');
    return ocrWorker;
  } catch (err) {
    console.error('[OCR] Worker initialization failed:', err);
    return null;
  }
}

/**
 * Extract text from a cropped bubble image
 */
export async function extractTextFromBubble(imageData, bubbleId) {
  try {
    const worker = await initializeOCR();
    if (!worker) throw new Error('OCR worker not available');

    console.log(`[OCR] Extracting text from bubble ${bubbleId}`);
    
    // imageData should be a base64 string or image element
    const { data } = await worker.recognize(imageData);
    
    const extractedText = data.text.trim();
    const confidence = parseFloat((data.confidence / 100).toFixed(2));
    
    console.log(`[OCR] Extracted: "${extractedText.substring(0, 50)}..." (${confidence})`);
    
    return {
      success: true,
      bubbleId,
      extractedText,
      confidence,
      allWords: data.words.map(w => ({
        text: w.text,
        confidence: w.confidence,
        bbox: w.bbox
      }))
    };
  } catch (err) {
    console.error('[OCR] Extraction error:', err);
    return {
      success: false,
      bubbleId,
      error: err.message
    };
  }
}

/**
 * Extract text from canvas region
 */
export async function extractTextFromCanvasRegion(canvas, x, y, width, height, bubbleId) {
  try {
    // Crop to bubble region with padding
    const padding = 5;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = width + padding * 2;
    cropCanvas.height = height + padding * 2;
    
    const ctx = cropCanvas.getContext('2d');
    ctx.drawImage(
      canvas,
      Math.max(0, x - padding),
      Math.max(0, y - padding),
      width + padding * 2,
      height + padding * 2,
      0,
      0,
      width + padding * 2,
      height + padding * 2
    );
    
    // Increase contrast for better OCR
    const imageData = ctx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
    enhanceContrast(imageData);
    ctx.putImageData(imageData, 0, 0);
    
    // Extract text
    const dataUrl = cropCanvas.toDataURL('image/png');
    return await extractTextFromBubble(dataUrl, bubbleId);
  } catch (err) {
    console.error('[OCR] Canvas extraction error:', err);
    return {
      success: false,
      bubbleId,
      error: err.message
    };
  }
}

/**
 * Extract text from image URL region
 */
export async function extractTextFromImageRegion(imageUrl, x, y, width, height, bubbleId) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const result = await extractTextFromCanvasRegion(canvas, x, y, width, height, bubbleId);
      resolve(result);
    };
    
    img.onerror = () => {
      resolve({
        success: false,
        bubbleId,
        error: 'Failed to load image'
      });
    };
    
    img.src = imageUrl;
  });
}

/**
 * Enhance image contrast for better text recognition
 */
function enhanceContrast(imageData) {
  const data = imageData.data;
  let min = 255, max = 0;
  
  // Find min and max intensity
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    min = Math.min(min, gray);
    max = Math.max(max, gray);
  }
  
  // Apply contrast stretch
  const range = max - min;
  if (range === 0) return;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const stretched = Math.round(((gray - min) / range) * 255);
    
    data[i] = stretched;
    data[i + 1] = stretched;
    data[i + 2] = stretched;
  }
}

/**
 * Terminate OCR worker to free resources
 */
export async function terminateOCR() {
  if (ocrWorker) {
    await ocrWorker.terminate();
    ocrWorker = null;
    console.log('[OCR] Worker terminated');
  }
}

export default {
  initializeOCR,
  extractTextFromBubble,
  extractTextFromCanvasRegion,
  extractTextFromImageRegion,
  terminateOCR
};
