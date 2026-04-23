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

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

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
