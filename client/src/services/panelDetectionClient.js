/**
 * Client-Side Panel Detection Service
 * Uses TensorFlow.js for real-time panel boundary detection
 * Provides live preview while server processes in background
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

let model = null;

/**
 * Initialize TensorFlow model for panel detection
 */
export async function initializePanelDetectionModel() {
  if (model) return model;
  
  console.log('[Panel Detection] Loading TensorFlow model...');
  
  try {
    // For now, use a simple approach with image analysis
    // In production, this would load a pre-trained model like:
    // model = await tf.loadLayersModel('path-to-panel-detection-model');
    
    console.log('[Panel Detection] Model ready');
    return true;
  } catch (err) {
    console.error('[Panel Detection] Model loading failed:', err);
    return false;
  }
}

/**
 * Detect panels from canvas image data
 * Returns array of bounding boxes
 */
export async function detectPanelsFromCanvas(canvas) {
  try {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Convert to grayscale and detect edges
    const edgeMap = detectEdges(imageData);
    
    // Find connected components (panel regions)
    const panels = findPanelRegions(edgeMap, canvas.width, canvas.height);
    
    return panels;
  } catch (err) {
    console.error('[Panel Detection] Canvas detection failed:', err);
    return [];
  }
}

/**
 * Detect panels from image URL
 */
export async function detectPanelsFromURL(imageUrl) {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const panels = await detectPanelsFromCanvas(canvas);
        resolve(panels);
      };
      
      img.onerror = reject;
      img.src = imageUrl;
    });
  } catch (err) {
    console.error('[Panel Detection] URL detection failed:', err);
    return [];
  }
}

/**
 * Detect edges in image using Sobel operator
 */
function detectEdges(imageData) {
  const { data, width, height } = imageData;
  const edgeData = new Float32Array(width * height);
  
  // Sobel edge detection kernels
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const idx = ((y - 1 + ky) * width + (x - 1 + kx)) * 4;
          const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          
          gx += gray * sobelX[ky][kx];
          gy += gray * sobelY[ky][kx];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edgeData[y * width + x] = magnitude > 50 ? magnitude : 0; // Threshold
    }
  }
  
  return { data: edgeData, width, height };
}

/**
 * Find panel regions from edge map using connected components
 */
function findPanelRegions(edgeMap, canvasWidth, canvasHeight) {
  const { data: edges, width, height } = edgeMap;
  const visited = new Uint8Array(width * height);
  const panels = [];
  
  // Find connected components (panel boundaries)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (edges[idx] > 0 && !visited[idx]) {
        // Start new region
        const region = floodFill(edges, visited, x, y, width, height);
        
        // Convert region to bounding box
        if (region.length > 100) { // Minimum component size
          const bbox = getBoundingBox(region, width);
          
          // Filter out very small or suspicious bounding boxes
          if (bbox.w > 20 && bbox.h > 20) {
            panels.push(bbox);
          }
        }
      }
    }
  }
  
  // Merge overlapping panels
  return mergeOverlappingPanels(panels);
}

/**
 * Flood fill algorithm for connected components
 */
function floodFill(edges, visited, startX, startY, width, height) {
  const region = [];
  const stack = [[startX, startY]];
  const threshold = 10; // Connectivity threshold
  
  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const idx = y * width + x;
    
    if (x < 0 || x >= width || y < 0 || y >= height || visited[idx]) {
      continue;
    }
    
    if (edges[idx] < threshold) {
      continue;
    }
    
    visited[idx] = 1;
    region.push([x, y]);
    
    // Add neighbors
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  
  return region;
}

/**
 * Get bounding box from region points
 */
function getBoundingBox(region, width) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const [x, y] of region) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  
  return {
    x: Math.round(minX),
    y: Math.round(minY),
    w: Math.round(maxX - minX),
    h: Math.round(maxY - minY)
  };
}

/**
 * Merge overlapping or very close bounding boxes
 */
function mergeOverlappingPanels(panels) {
  if (panels.length === 0) return [];
  
  // Sort by position
  panels.sort((a, b) => a.y - b.y || a.x - b.x);
  
  const merged = [];
  let current = panels[0];
  
  for (let i = 1; i < panels.length; i++) {
    const next = panels[i];
    
    // Check if boxes overlap or are very close
    if (boxesOverlap(current, next)) {
      // Merge boxes
      current = {
        x: Math.min(current.x, next.x),
        y: Math.min(current.y, next.y),
        w: Math.max(current.x + current.w, next.x + next.w) - Math.min(current.x, next.x),
        h: Math.max(current.y + current.h, next.y + next.h) - Math.min(current.y, next.y)
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  
  merged.push(current);
  return merged;
}

/**
 * Check if two bounding boxes overlap
 */
function boxesOverlap(box1, box2, threshold = 30) {
  const minDist = threshold;
  
  const horizontalGap = Math.max(
    0,
    Math.max(box1.x, box2.x) - Math.min(box1.x + box1.w, box2.x + box2.w)
  );
  
  const verticalGap = Math.max(
    0,
    Math.max(box1.y, box2.y) - Math.min(box1.y + box1.h, box2.y + box2.h)
  );
  
  return horizontalGap < minDist && verticalGap < minDist;
}

export default {
  initializePanelDetectionModel,
  detectPanelsFromCanvas,
  detectPanelsFromURL
};
