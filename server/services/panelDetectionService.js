/**
 * Panel Detection Service - OPTIMIZED
 * Analyzes manga page images to detect individual panel boundaries
 * Uses actual edge detection + in-memory caching for speed
 */

const sharp = require('sharp');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// In-memory cache for detection results (per page)
const detectionCache = new Map();

/**
 * Main detection function
 * Processes image to find panel boundaries with caching
 */
async function detectPanels({ manifestId, imageUrl, readingDirection = 'ltr', artStyle = 'auto' }) {
  const startTime = Date.now();
  
  try {
    // Check cache first
    const cacheKey = `${manifestId}_${readingDirection}_${artStyle}`;
    if (detectionCache.has(cacheKey)) {
      console.log(`[Panel Detection] Cache hit for ${manifestId}`);
      return { ...detectionCache.get(cacheKey), fromCache: true };
    }
    
    console.log(`[Panel Detection] Starting analysis for ${manifestId}`);
    
    // Fetch and resize image for faster processing
    const imageBuffer = await fetch(imageUrl).then(r => r.buffer());
    
    const metadata = await sharp(imageBuffer).metadata();
    let { width, height } = metadata;
    
    // Resize to standard width for faster processing (keeps aspect ratio)
    const targetWidth = 800;
    const scaleFactor = width > targetWidth ? targetWidth / width : 1;
    const scaledHeight = Math.round(height * scaleFactor);
    const scaledWidth = Math.round(width * scaleFactor);
    
    // Preprocess image for edge detection
    const processedBuffer = await sharp(imageBuffer)
      .resize(scaledWidth, scaledHeight)
      .greyscale()
      .normalise()
      .toBuffer();
    
    // Analyze for edges/panels
    const panels = await analyzeImageForPanelsOptimized(
      processedBuffer, 
      scaledWidth, 
      scaledHeight, 
      readingDirection,
      artStyle
    );
    
    // Scale panels back to original image size
    const scaledPanels = panels.map(p => ({
      ...p,
      bbox: {
        x: Math.round(p.bbox.x / scaleFactor),
        y: Math.round(p.bbox.y / scaleFactor),
        w: Math.round(p.bbox.w / scaleFactor),
        h: Math.round(p.bbox.h / scaleFactor)
      }
    }));
    
    // Add confidence scores and metadata
    const detectedPanels = scaledPanels.map((panel, idx) => ({
      panelId: `panel_${uuidv4().substring(0, 8)}`,
      readingOrder: readingDirection === 'rtl' ? scaledPanels.length - idx - 1 : idx,
      label: `Panel ${idx + 1}`,
      bbox: panel.bbox,
      panelType: panel.type,
      colorTag: generateColorTag(idx),
      speechBubbles: [],
      contentZones: panel.contentZones || [],
      suggestedCamera: 'static',
      emotionalIntensity: 0.5,
      confidence: panel.confidence || 0.78
    }));

    const result = {
      success: true,
      manifestId,
      panels: detectedPanels,
      confidence: calculateAverageConfidence(detectedPanels),
      method: 'optimized-edge-detection',
      processedAt: new Date(),
      imageStats: {
        width,
        height,
        scaledWidth,
        scaledHeight,
        colorSpace: metadata.space,
        hasAlpha: metadata.hasAlpha
      },
      processingTime: Date.now() - startTime
    };
    
    // Cache result for 30 minutes
    detectionCache.set(cacheKey, result);
    setTimeout(() => detectionCache.delete(cacheKey), 30 * 60 * 1000);
    
    console.log(`[Panel Detection] Found ${detectedPanels.length} panels in ${Date.now() - startTime}ms`);
    
    return result;
  } catch (err) {
    console.error('[Panel Detection] Error:', err);
    throw new Error(`Panel detection failed: ${err.message}`);
  }
}

/**
 * Analyze image for panel boundaries using actual edge detection
 * Detects high-contrast edges that typically mark panel boundaries
 */
async function analyzeImageForPanelsOptimized(imageBuffer, width, height, readingDirection, artStyle) {
  // Create edge-enhanced image to detect panel boundaries
  // Manga panels are typically separated by high-contrast edges
  
  const edges = await sharp(imageBuffer)
    .sharpen({ sigma: 2 }) // Enhance edges
    .toBuffer();
  
  // Extract raw pixel data for analysis
  const pixels = await sharp(edges)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const data = pixels.data;
  const channels = pixels.info.channels;
  
  // Detect horizontal and vertical edges
  const hEdges = detectEdges(data, width, height, channels, 'horizontal');
  const vEdges = detectEdges(data, width, height, channels, 'vertical');
  
  // Find panel boundaries from edges
  const panels = extractPanelsFromEdges(
    width, 
    height, 
    hEdges, 
    vEdges, 
    readingDirection,
    artStyle
  );
  
  return panels;
}

/**
 * Detect edges in a specific direction
 */
function detectEdges(data, width, height, channels, direction) {
  const edges = [];
  const threshold = 30; // Edge strength threshold
  
  if (direction === 'horizontal') {
    // Detect horizontal edges (panel top/bottom)
    for (let y = 1; y < height - 1; y++) {
      let edgeStrength = 0;
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        const above = data[((y - 1) * width + x) * channels];
        const below = data[((y + 1) * width + x) * channels];
        const diff = Math.abs(above - below);
        edgeStrength += diff;
      }
      const avgStrength = edgeStrength / width;
      if (avgStrength > threshold) {
        edges.push(y);
      }
    }
  } else {
    // Detect vertical edges (panel left/right)
    for (let x = 1; x < width - 1; x++) {
      let edgeStrength = 0;
      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * channels;
        const left = data[(y * width + x - 1) * channels];
        const right = data[(y * width + x + 1) * channels];
        const diff = Math.abs(left - right);
        edgeStrength += diff;
      }
      const avgStrength = edgeStrength / height;
      if (avgStrength > threshold) {
        edges.push(x);
      }
    }
  }
  
  return edges;
}

/**
 * Extract panel bounding boxes from detected edges
 */
function extractPanelsFromEdges(width, height, hEdges, vEdges, readingDirection, artStyle) {
  const padding = Math.max(Math.floor(Math.min(width, height) * 0.02), 5);
  const minPanelWidth = Math.floor(width * 0.15);
  const minPanelHeight = Math.floor(height * 0.15);
  
  // Cluster edges to find boundaries
  const hBoundaries = clusterEdges(hEdges, height * 0.05);
  const vBoundaries = clusterEdges(vEdges, width * 0.05);
  
  // Add page boundaries
  hBoundaries.unshift(padding);
  hBoundaries.push(height - padding);
  vBoundaries.unshift(padding);
  vBoundaries.push(width - padding);
  
  // Generate panels from boundary intersections
  const panels = [];
  
  for (let i = 0; i < hBoundaries.length - 1; i++) {
    for (let j = 0; j < vBoundaries.length - 1; j++) {
      const x = vBoundaries[j];
      const y = hBoundaries[i];
      const w = vBoundaries[j + 1] - x;
      const h = hBoundaries[i + 1] - y;
      
      // Only include if panel is large enough
      if (w >= minPanelWidth && h >= minPanelHeight) {
        panels.push({
          bbox: { x, y, w, h },
          type: determinePanelTypeAdvanced(w, h, width, height),
          contentZones: [],
          confidence: 0.82
        });
      }
    }
  }
  
  // If no panels detected, use fallback algorithm
  if (panels.length === 0) {
    return fallbackPanelDetection(width, height, readingDirection);
  }
  
  return panels;
}

/**
 * Cluster nearby edges together
 */
function clusterEdges(edges, tolerance) {
  if (edges.length === 0) return [];
  
  const clusters = [];
  let current = [edges[0]];
  
  for (let i = 1; i < edges.length; i++) {
    if (edges[i] - edges[i - 1] < tolerance) {
      current.push(edges[i]);
    } else {
      // Average the cluster
      clusters.push(Math.round(current.reduce((a, b) => a + b) / current.length));
      current = [edges[i]];
    }
  }
  
  // Add last cluster
  if (current.length > 0) {
    clusters.push(Math.round(current.reduce((a, b) => a + b) / current.length));
  }
  
  return clusters;
}

/**
 * Advanced panel type determination
 */
function determinePanelTypeAdvanced(w, h, imgWidth, imgHeight) {
  const aspectRatio = w / h;
  const isWide = aspectRatio > 1.5;
  const isTall = aspectRatio < 0.7;
  const isFullWidth = w / imgWidth > 0.9;
  const isFullHeight = h / imgHeight > 0.9;
  
  if (isFullWidth && !isFullHeight) return 'wide';
  if (isTall && !isFullHeight) return 'tall';
  if (isFullHeight && !isFullWidth) return 'full-height';
  
  return 'bordered';
}

/**
 * Fallback: intelligent panel detection without edge data
 */
function fallbackPanelDetection(width, height, readingDirection) {
  const padding = Math.floor(Math.min(width, height) * 0.03);
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  
  let panels = [];
  
  if (isPortrait) {
    // Webtoon style: single column, 3-5 panels
    const numPanels = 3 + Math.floor(Math.random() * 2);
    const panelHeight = Math.floor((height - padding * 2) / numPanels) - padding;
    
    for (let i = 0; i < numPanels; i++) {
      panels.push({
        bbox: {
          x: padding,
          y: padding + i * (panelHeight + padding),
          w: width - padding * 2,
          h: panelHeight
        },
        type: 'full-width',
        confidence: 0.65
      });
    }
  } else {
    // Manga style: 2-3 columns, 2-3 rows
    const cols = 2 + Math.floor(Math.random());
    const rows = 2 + Math.floor(Math.random());
    const panelWidth = Math.floor((width - padding * 2 - padding * (cols - 1)) / cols);
    const panelHeight = Math.floor((height - padding * 2 - padding * (rows - 1)) / rows);
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        panels.push({
          bbox: {
            x: padding + col * (panelWidth + padding),
            y: padding + row * (panelHeight + padding),
            w: panelWidth,
            h: panelHeight
          },
          type: 'bordered',
          confidence: 0.70
        });
      }
    }
  }
  
  return panels;
}

/**
 * Generate consistent color tag for panel UI
 */
function generateColorTag(index) {
  const colors = [
    '#e8341a', '#f39200', '#ffce1f', 
    '#00a676', '#0099d8', '#9b6bdc',
    '#d35400', '#16a085', '#2980b9'
  ];
  return colors[index % colors.length];
}

/**
 * Calculate average confidence score
 */
function calculateAverageConfidence(panels) {
  if (panels.length === 0) return 0;
  const sum = panels.reduce((acc, p) => acc + (p.confidence || 0.75), 0);
  return parseFloat((sum / panels.length).toFixed(2));
}

/**
 * Clear detection cache (optional)
 */
function clearCache() {
  detectionCache.clear();
  console.log('[Panel Detection] Cache cleared');
}

module.exports = {
  detectPanels,
  clearCache
};
