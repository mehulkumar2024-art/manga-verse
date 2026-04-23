const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for manga cover images
const coverStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'mangaverse/covers',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 1200, crop: 'limit', quality: 'auto' }],
  },
});

// Storage for manga pages
const pageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'mangaverse/pages',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, quality: 'auto' }],
  },
});

// Storage for avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'mangaverse/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
  },
});

const uploadCover = multer({ storage: coverStorage });
const uploadPages = multer({ storage: pageStorage });
const uploadAvatar = multer({ storage: avatarStorage });

module.exports = { cloudinary, uploadCover, uploadPages, uploadAvatar };
