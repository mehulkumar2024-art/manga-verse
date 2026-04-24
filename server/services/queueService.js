const Queue = require('bull');
const redis = require('redis');

// Redis connection with fallback for development
let redisClient = null;
let useRedis = true;

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    if (times > 3) {
      if (useRedis) {
        console.warn('⚠️  Redis connection failed - Falling back to in-memory queue');
        useRedis = false;
      }
      return null; // Stop retrying
    }
    return Math.min(times * 100, 3000);
  },
};

try {
  redisClient = redis.createClient(redisConfig);

  redisClient.on('error', (err) => {
    if (useRedis && process.env.NODE_ENV !== 'production') {
      // Only log once to avoid spam
      console.warn('ℹ️  Redis not detected. Using in-memory fallback for queues.');
      useRedis = false;
    }
  });
  
  redisClient.on('connect', () => {
    useRedis = true;
    console.log('✓ Redis connected');
  });
} catch (err) {
  useRedis = false;
}


// Create job queues
const panelDetectionQueue = useRedis ? new Queue('panel-detection', {
  redis: { host: process.env.REDIS_HOST || 'localhost', port: process.env.REDIS_PORT || 6379 }
}) : createInMemoryQueue('panel-detection');

const characterDetectionQueue = useRedis ? new Queue('character-detection', {
  redis: { host: process.env.REDIS_HOST || 'localhost', port: process.env.REDIS_PORT || 6379 }
}) : createInMemoryQueue('character-detection');

const ocrQueue = useRedis ? new Queue('ocr-processing', {
  redis: { host: process.env.REDIS_HOST || 'localhost', port: process.env.REDIS_PORT || 6379 }
}) : createInMemoryQueue('ocr-processing');

const ttsQueue = useRedis ? new Queue('tts-generation', {
  redis: { host: process.env.REDIS_HOST || 'localhost', port: process.env.REDIS_PORT || 6379 }
}) : createInMemoryQueue('tts-generation');

// In-memory queue fallback for development
function createInMemoryQueue(name) {
  const jobs = new Map();
  let jobCounter = 0;

  return {
    add: (data, options) => {
      const jobId = ++jobCounter;
      const job = { id: jobId, data, state: 'waiting', ...options };
      jobs.set(jobId, job);
      
      // Simulate async processing
      setImmediate(async () => {
        job.state = 'active';
        try {
          if (this._processor) {
            await this._processor(job);
          }
          job.state = 'completed';
          if (this._handlers && this._handlers.completed) {
            this._handlers.completed.forEach(h => h(job));
          }
        } catch (error) {
          job.state = 'failed';
          if (this._handlers && this._handlers.failed) {
            this._handlers.failed.forEach(h => h(job, error));
          }
        }
      });
      
      return Promise.resolve(job);
    },
    process: (processor) => {
      this._processor = processor;
    },
    on: (event, handler) => {
      if (!this._handlers) this._handlers = {};
      if (!this._handlers[event]) this._handlers[event] = [];
      this._handlers[event].push(handler);
    },
    close: () => Promise.resolve(),
    _handlers: {},
    _processor: null
  };
}

// Job processors
panelDetectionQueue.process(async (job) => {
  const panelDetectionService = require('./panelDetectionService');
  return await panelDetectionService.detectPanels(job.data);
});

characterDetectionQueue.process(async (job) => {
  const characterDetectionService = require('./characterDetectionService');
  return await characterDetectionService.detectCharacters(job.data);
});

ocrQueue.process(async (job) => {
  const ocrService = require('./ocrService');
  return await ocrService.extractText(job.data);
});

ttsQueue.process(async (job) => {
  const ttsService = require('./ttsService');
  return await ttsService.generateVoice(job.data);
});

// Queue event handlers with database persistence
const setupQueueListeners = (queue, queueName) => {
  queue.on('active', (job) => {
    console.log(`[${queueName}] Job ${job.id} started`);
  });

  queue.on('completed', async (job) => {
    console.log(`[${queueName}] Job ${job.id} completed`);
    
    // Save results to database based on queue type
    try {
      const { databases } = require('../config/appwrite');
      const DB = 'mangaverse';
      const PANEL_MANIFESTS = 'panel_manifests';
      
      if (queueName === 'Panel Detection' && job.returnvalue) {
        const result = job.returnvalue;
        await databases.updateDocument(DB, PANEL_MANIFESTS, result.manifestId, {
          detectedPanels: JSON.stringify(result.panels),
          status: 'detected',
          detectionConfidence: result.confidence,
          detectionMethod: result.method
        });
        console.log(`✓ Saved ${result.panels.length} detected panels to manifest ${result.manifestId}`);
      }
    } catch (err) {
      console.error(`[${queueName}] Failed to save results:`, err.message);
    }
  });

  queue.on('failed', (job, err) => {
    if (useRedis) console.error(`[${queueName}] Job ${job.id} failed:`, err.message);
  });

  queue.on('error', (err) => {
    if (useRedis) console.error(`[${queueName}] Queue error:`, err);
  });
};


setupQueueListeners(panelDetectionQueue, 'Panel Detection');
setupQueueListeners(characterDetectionQueue, 'Character Detection');
setupQueueListeners(ocrQueue, 'OCR');
setupQueueListeners(ttsQueue, 'TTS');

module.exports = {
  panelDetectionQueue,
  characterDetectionQueue,
  ocrQueue,
  ttsQueue,
  redisClient,
  // Helper functions
  async addPanelDetection(data) {
    return await panelDetectionQueue.add(data, { 
      attempts: 3, 
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: false 
    });
  },
  async addCharacterDetection(data) {
    return await characterDetectionQueue.add(data, { 
      attempts: 2, 
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: false 
    });
  },
  async addOCR(data) {
    return await ocrQueue.add(data, { 
      attempts: 2, 
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: false 
    });
  },
  async addTTS(data) {
    return await ttsQueue.add(data, { 
      attempts: 2, 
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: false 
    });
  }
};
