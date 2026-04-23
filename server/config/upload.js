const multer = require('multer');
const { ID } = require('node-appwrite');
const { InputFile } = require('node-appwrite/file');
const { storage } = require('./appwrite');

// Use memory storage since we need to pass the buffer to Appwrite SDK
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

const uploadCover = upload.single('cover');
const uploadPages = upload.array('pages', 100);
const uploadAvatar = upload.single('avatar');

/**
 * Helper to upload a buffer to an Appwrite bucket
 * @param {string} bucketId - The Appwrite bucket ID ('covers', 'pages', 'avatars')
 * @param {Buffer} buffer - The file buffer
 * @param {string} filename - Original filename
 * @param {string} mimetype - File mime type
 * @returns {Promise<string>} The file URL
 */
const uploadToAppwrite = async (bucketId, buffer, filename, mimetype) => {
    // node-appwrite expects an InputFile object
    const file = InputFile.fromBuffer(buffer, filename);
    const uploadedFile = await storage.createFile(bucketId, ID.unique(), file);
    
    // Generate the URL to view the file
    const fileUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${uploadedFile.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
    
    return {
        url: fileUrl,
        publicId: uploadedFile.$id
    };
};

module.exports = {
    uploadCover,
    uploadPages,
    uploadAvatar,
    uploadToAppwrite
};
