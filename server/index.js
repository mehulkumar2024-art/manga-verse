const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const mangaRoutes = require('./routes/manga');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const chapterRoutes = require('./routes/chapter');
const panelRoutes = require('./routes/panels');
const characterRoutes = require('./routes/characters');

const app = express();

// Security & CORS Headers
app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

// Content Security Policy - Allow Appwrite and necessary resources
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:* https://*.appwrite.io https://sgp.cloud.appwrite.io; frame-ancestors 'none';"
  );
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Welcome route
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'MangaVerse API - Powered by Appwrite',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      manga: '/api/manga',
      chapters: '/api/chapters',
      panels: '/api/panels',
      characters: '/api/characters',
      users: '/api/users'
    }
  });
});

// Chrome DevTools compatibility
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.json({ installed_version: '1.0' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/manga', mangaRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/panels', panelRoutes);
app.use('/api/characters', characterRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'MangaVerse API running on Appwrite' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Internal server error' 
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Powered by Appwrite Backend`);
});

module.exports = app;
