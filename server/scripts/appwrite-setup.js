const { Client, Databases, Storage, Permission, Role } = require('node-appwrite');
require('dotenv').config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function createBucketIfNotExists(bucketId, name) {
    try {
        await storage.createBucket(
            bucketId,
            name,
            [
                Permission.read(Role.any()),
                Permission.create(Role.users()),
                Permission.update(Role.users()),
                Permission.delete(Role.users())
            ],
            false,
            true, // Enable file security? no wait, we want public read.
            undefined,
            ['jpg', 'png', 'jpeg', 'webp'] // Allowed file extensions
        );
        console.log(`Bucket "${name}" created.`);
    } catch (e) {
        if (e.code === 409) console.log(`Bucket "${name}" already exists.`);
        else console.error(`Error creating bucket ${name}:`, e.message);
    }
}

async function setupAppwrite() {
    try {
        console.log('Starting Appwrite Setup...');
        
        let dbId = 'mangaverse';
        
        // Try to create Database
        try {
            await databases.create(dbId, 'MangaVerse');
            console.log('Database "MangaVerse" created.');
        } catch (e) {
            if (e.code === 409) {
                console.log('Database "MangaVerse" already exists.');
            } else {
                throw e;
            }
        }

        // --- Storage Buckets ---
        await createBucketIfNotExists('covers', 'Manga Covers');
        await createBucketIfNotExists('pages', 'Chapter Pages');
        await createBucketIfNotExists('avatars', 'Character Avatars');

        // --- Users Collection ---
        try {
            await databases.createCollection(dbId, 'users', 'Users', [
                Permission.read(Role.any()),
                Permission.create(Role.users()),
                Permission.update(Role.users()),
                Permission.delete(Role.users())
            ]);
            console.log('Collection "Users" created.');
            await sleep(1000);
            
            // Attributes
            await databases.createStringAttribute(dbId, 'users', 'uid', 255, true);
            await databases.createStringAttribute(dbId, 'users', 'email', 255, true);
            await databases.createStringAttribute(dbId, 'users', 'username', 255, true);
            await databases.createStringAttribute(dbId, 'users', 'displayName', 255, false);
            await databases.createStringAttribute(dbId, 'users', 'avatar', 1000, false);
            await databases.createStringAttribute(dbId, 'users', 'bio', 500, false);
            await databases.createBooleanAttribute(dbId, 'users', 'isArtist', false, false);
            await databases.createBooleanAttribute(dbId, 'users', 'emailVerified', false, false);
            await databases.createStringAttribute(dbId, 'users', 'savedManga', 255, false, undefined, true);
            await databases.createStringAttribute(dbId, 'users', 'likedManga', 255, false, undefined, true);
            await databases.createStringAttribute(dbId, 'users', 'following', 255, false, undefined, true);
            await databases.createStringAttribute(dbId, 'users', 'followers', 255, false, undefined, true);
            console.log('Attributes for "Users" created.');
        } catch (e) {
            if (e.code === 409) console.log('Collection "Users" already exists.');
            else console.error('Error creating Users:', e.message);
        }

        // --- Manga Collection ---
        try {
            await databases.createCollection(dbId, 'mangas', 'Mangas', [
                Permission.read(Role.any()),
                Permission.create(Role.users()),
                Permission.update(Role.users()),
                Permission.delete(Role.users())
            ]);
            console.log('Collection "Mangas" created.');
            await sleep(1000);

            await databases.createStringAttribute(dbId, 'mangas', 'title', 255, true);
            await databases.createStringAttribute(dbId, 'mangas', 'description', 2000, true);
            await databases.createStringAttribute(dbId, 'mangas', 'coverImage', 1000, true);
            await databases.createStringAttribute(dbId, 'mangas', 'coverImagePublicId', 255, false);
            await databases.createStringAttribute(dbId, 'mangas', 'authorId', 255, true);
            await databases.createStringAttribute(dbId, 'mangas', 'genres', 50, false, undefined, true);
            await databases.createStringAttribute(dbId, 'mangas', 'status', 50, false, 'Ongoing');
            await databases.createIntegerAttribute(dbId, 'mangas', 'views', false, 0, 1000000000, 0);
            await databases.createIntegerAttribute(dbId, 'mangas', 'likes', false, 0, 1000000000, 0);
            await databases.createIntegerAttribute(dbId, 'mangas', 'saves', false, 0, 1000000000, 0);
            await databases.createFloatAttribute(dbId, 'mangas', 'rating', false, 0, 5, 0);
            await databases.createStringAttribute(dbId, 'mangas', 'tags', 50, false, undefined, true);
            console.log('Attributes for "Mangas" created.');
        } catch (e) {
            if (e.code === 409) console.log('Collection "Mangas" already exists.');
            else console.error('Error creating Mangas:', e.message);
        }

        // --- Chapters Collection ---
        try {
            await databases.createCollection(dbId, 'chapters', 'Chapters', [
                Permission.read(Role.any()),
                Permission.create(Role.users()),
                Permission.update(Role.users()),
                Permission.delete(Role.users())
            ]);
            console.log('Collection "Chapters" created.');
            await sleep(1000);

            await databases.createStringAttribute(dbId, 'chapters', 'mangaId', 255, true);
            await databases.createIntegerAttribute(dbId, 'chapters', 'chapterNumber', true);
            await databases.createStringAttribute(dbId, 'chapters', 'title', 255, false);
            await databases.createStringAttribute(dbId, 'chapters', 'pages', 1000000, false); // JSON string
            await databases.createIntegerAttribute(dbId, 'chapters', 'views', false, 0, 1000000000, 0);
            console.log('Attributes for "Chapters" created.');
        } catch (e) {
            if (e.code === 409) console.log('Collection "Chapters" already exists.');
            else console.error('Error creating Chapters:', e.message);
        }

        // --- Characters Collection ---
        try {
            await databases.createCollection(dbId, 'characters', 'Characters', [
                Permission.read(Role.any()),
                Permission.create(Role.users()),
                Permission.update(Role.users()),
                Permission.delete(Role.users())
            ]);
            console.log('Collection "Characters" created.');
            await sleep(1000);

            await databases.createStringAttribute(dbId, 'characters', 'mangaId', 255, true);
            await databases.createStringAttribute(dbId, 'characters', 'uploaderId', 255, true);
            await databases.createStringAttribute(dbId, 'characters', 'name', 255, true);
            await databases.createStringAttribute(dbId, 'characters', 'aliases', 255, false, undefined, true);
            await databases.createStringAttribute(dbId, 'characters', 'colorTag', 50, false);
            await databases.createStringAttribute(dbId, 'characters', 'voiceType', 50, false);
            await databases.createStringAttribute(dbId, 'characters', 'voiceId', 255, false);
            await databases.createBooleanAttribute(dbId, 'characters', 'isMainCharacter', false, false);
            console.log('Attributes for "Characters" created.');
        } catch (e) {
            if (e.code === 409) console.log('Collection "Characters" already exists.');
            else console.error('Error creating Characters:', e.message);
        }

        // --- PanelManifests Collection ---
        try {
            await databases.createCollection(dbId, 'panel_manifests', 'PanelManifests', [
                Permission.read(Role.any()),
                Permission.create(Role.users()),
                Permission.update(Role.users()),
                Permission.delete(Role.users())
            ]);
            console.log('Collection "PanelManifests" created.');
        } catch (e) {
            if (e.code === 409) console.log('Collection "PanelManifests" already exists.');
            else console.error('Error creating PanelManifests:', e.message);
        }
        
        // Add attributes (will skip if they already exist)
        await sleep(1000);
        try {
            await databases.createStringAttribute(dbId, 'panel_manifests', 'chapterId', 255, true);
        } catch (e) { if (e.code !== 409) console.log('chapterId:', e.message); }
        
        try {
            await databases.createStringAttribute(dbId, 'panel_manifests', 'mangaId', 255, true);
        } catch (e) { if (e.code !== 409) console.log('mangaId:', e.message); }
        
        try {
            await databases.createIntegerAttribute(dbId, 'panel_manifests', 'pageNumber', true);
        } catch (e) { if (e.code !== 409) console.log('pageNumber:', e.message); }
        
        try {
            await databases.createStringAttribute(dbId, 'panel_manifests', 'imageUrl', 1000, true);
        } catch (e) { if (e.code !== 409) console.log('imageUrl:', e.message); }
        
        try {
            await databases.createStringAttribute(dbId, 'panel_manifests', 'status', 50, false, 'pending_detection');
        } catch (e) { if (e.code !== 409) console.log('status:', e.message); }
        
        try {
            await databases.createStringAttribute(dbId, 'panel_manifests', 'detectedPanels', 1000000, false);
        } catch (e) { if (e.code !== 409) console.log('detectedPanels:', e.message); }
        
        try {
            await databases.createStringAttribute(dbId, 'panel_manifests', 'panels', 1000000, false);
        } catch (e) { if (e.code !== 409) console.log('panels:', e.message); }
        
        try {
            await databases.createStringAttribute(dbId, 'panel_manifests', 'corrections', 1000000, false);
        } catch (e) { if (e.code !== 409) console.log('corrections:', e.message); }
        
        try {
            await databases.createStringAttribute(dbId, 'panel_manifests', 'uploader', 255, false);
        } catch (e) { if (e.code !== 409) console.log('uploader:', e.message); }
        
        try {
            await databases.createIntegerAttribute(dbId, 'panel_manifests', 'imageWidth', false, 0, 10000, 800);
        } catch (e) { if (e.code !== 409) console.log('imageWidth:', e.message); }
        
        try {
            await databases.createIntegerAttribute(dbId, 'panel_manifests', 'imageHeight', false, 0, 10000, 1100);
        } catch (e) { if (e.code !== 409) console.log('imageHeight:', e.message); }
        
        try {
            await databases.createStringAttribute(dbId, 'panel_manifests', 'readingDirection', 10, false, 'ltr');
        } catch (e) { if (e.code !== 409) console.log('readingDirection:', e.message); }
        
        try {
            await databases.createStringAttribute(dbId, 'panel_manifests', 'artStyle', 50, false, 'auto');
        } catch (e) { if (e.code !== 409) console.log('artStyle:', e.message); }
        
        try {
            await databases.createFloatAttribute(dbId, 'panel_manifests', 'detectionConfidence', false, 0, 1, 0);
        } catch (e) { if (e.code !== 409) console.log('detectionConfidence:', e.message); }
        
        try {
            await databases.createStringAttribute(dbId, 'panel_manifests', 'detectionMethod', 50, false, 'pending');
        } catch (e) { if (e.code !== 409) console.log('detectionMethod:', e.message); }
        
        console.log('Panel manifests attributes processed.');

        console.log('Appwrite setup completed. Please verify in your Appwrite Console.');
    } catch (error) {
        console.error('Setup failed:', error);
    }
}

setupAppwrite();
