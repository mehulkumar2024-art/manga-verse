const Queue = require('bull');

// Redis connection with fallback for development
let useRedis = false; // Default to false, enable only if Redis is available
let redisConnected = false;

// Try to detect Redis availability asynchronously
const checkRedisAvailability = async () => {
  try {
    const redis = require('redis');
    const client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: { reconnectStrategy: () => null },
      commandsQueueMaxLen: 0,
    });

    // Try to ping with timeout
    const pingPromise = new Promise((resolve) => {
      setTimeout(() => resolve(false), 2000); // 2 second timeout
    });

    client.on('error', () => {
      redisConnected = false;
    });

    client.on('connect', () => {
      redisConnected = true;
      useRedis = true;
      console.log('✓ Redis connected for job queues');
      client.disconnect();
    });

    client.connect().catch(() => {
      redisConnected = false;
    });

    await pingPromise;
  } catch (err) {
    redisConnected = false;
  }

  if (!redisConnected) {
    console.warn('⚠️  Redis not available - Using in-memory queues for development');
  }
};

// Start checking Redis availability immediately but don't block
checkRedisAvailability().catch(() => {
  console.warn('⚠️  Redis check failed - Using in-memory queues');
});


// Create job queues with in-memory fallback
const createQueues = () => {
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

  return { panelDetectionQueue, characterDetectionQueue, ocrQueue, ttsQueue };
};

let panelDetectionQueue = createInMemoryQueue('panel-detection');
let characterDetectionQueue = createInMemoryQueue('character-detection');
let ocrQueue = createInMemoryQueue('ocr-processing');
let ttsQueue = createInMemoryQueue('tts-generation');

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

// Job processors (with safe requires)
try {
  panelDetectionQueue.process?.(async (job) => {
    try {
      const panelDetectionService = require('./panelDetectionService');
      return await panelDetectionService.detectPanels(job.data);
    } catch (err) {
      console.error('[Panel Detection] Process error:', err.message);
      throw err;
    }
  });
} catch (err) {
  console.warn('[Panel Detection] Processor setup skipped (using in-memory queue)');
}

try {
  characterDetectionQueue.process?.(async (job) => {
    try {
      const characterDetectionService = require('./characterDetectionService');
      return await characterDetectionService.detectCharacters(job.data);
    } catch (err) {
      console.error('[Character Detection] Process error:', err.message);
      throw err;
    }
  });
} catch (err) {
  console.warn('[Character Detection] Processor setup skipped (using in-memory queue)');
}

try {
  ocrQueue.process?.(async (job) => {
    try {
      const ocrService = require('./ocrService');
      return await ocrService.extractText(job.data);
    } catch (err) {
      console.error('[OCR] Process error:', err.message);
      throw err;
    }
  });
} catch (err) {
  console.warn('[OCR] Processor setup skipped (using in-memory queue)');
}

try {
  ttsQueue.process?.(async (job) => {
    try {
      const ttsService = require('./ttsService');
      return await ttsService.generateVoice(job.data);
    } catch (err) {
      console.error('[TTS] Process error:', err.message);
      throw err;
    }
  });
} catch (err) {
  console.warn('[TTS] Processor setup skipped (using in-memory queue)');
}

module.exports = {
  panelDetectionQueue,
  characterDetectionQueue,
  ocrQueue,
  ttsQueue,
  redisClient: null, // Not used with in-memory queues
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
