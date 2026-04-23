const { Client, Databases } = require('node-appwrite');
require('dotenv').config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const dbId = 'mangaverse';

async function safeCreate(fn) {
    try {
        await fn();
        console.log('Created attribute successfully');
    } catch (e) {
        if (e.code === 409) {
            console.log('Attribute already exists');
        } else {
            console.error('Error:', e.message);
        }
    }
}

async function setupAttributes() {
    console.log('Creating Manga attributes...');
    await safeCreate(() => databases.createStringAttribute(dbId, 'mangas', 'title', 255, true));
    await safeCreate(() => databases.createStringAttribute(dbId, 'mangas', 'description', 2000, true));
    await safeCreate(() => databases.createStringAttribute(dbId, 'mangas', 'coverImage', 1000, true));
    await safeCreate(() => databases.createStringAttribute(dbId, 'mangas', 'coverImagePublicId', 255, false));
    await safeCreate(() => databases.createStringAttribute(dbId, 'mangas', 'authorId', 255, true));
    await safeCreate(() => databases.createStringAttribute(dbId, 'mangas', 'genres', 50, false, undefined, true));
    await safeCreate(() => databases.createStringAttribute(dbId, 'mangas', 'status', 50, false, 'Ongoing'));
    await safeCreate(() => databases.createIntegerAttribute(dbId, 'mangas', 'views', false, 0, 1000000000, 0));
    await safeCreate(() => databases.createIntegerAttribute(dbId, 'mangas', 'likes', false, 0, 1000000000, 0));
    await safeCreate(() => databases.createIntegerAttribute(dbId, 'mangas', 'saves', false, 0, 1000000000, 0));
    await safeCreate(() => databases.createFloatAttribute(dbId, 'mangas', 'rating', false, 0, 5, 0));
    await safeCreate(() => databases.createStringAttribute(dbId, 'mangas', 'tags', 50, false, undefined, true));

    console.log('Creating Chapter attributes...');
    await safeCreate(() => databases.createStringAttribute(dbId, 'chapters', 'mangaId', 255, true));
    await safeCreate(() => databases.createIntegerAttribute(dbId, 'chapters', 'chapterNumber', true));
    await safeCreate(() => databases.createStringAttribute(dbId, 'chapters', 'title', 255, false));
    await safeCreate(() => databases.createStringAttribute(dbId, 'chapters', 'pages', 1000000, false));
    await safeCreate(() => databases.createIntegerAttribute(dbId, 'chapters', 'views', false, 0, 1000000000, 0));

    console.log('Creating Character attributes...');
    await safeCreate(() => databases.createStringAttribute(dbId, 'characters', 'mangaId', 255, true));
    await safeCreate(() => databases.createStringAttribute(dbId, 'characters', 'uploaderId', 255, true));
    await safeCreate(() => databases.createStringAttribute(dbId, 'characters', 'name', 255, true));
    await safeCreate(() => databases.createStringAttribute(dbId, 'characters', 'aliases', 255, false, undefined, true));
    await safeCreate(() => databases.createStringAttribute(dbId, 'characters', 'colorTag', 50, false));
    await safeCreate(() => databases.createStringAttribute(dbId, 'characters', 'voiceType', 50, false));
    await safeCreate(() => databases.createStringAttribute(dbId, 'characters', 'voiceId', 255, false));
    await safeCreate(() => databases.createBooleanAttribute(dbId, 'characters', 'isMainCharacter', false, false));

    console.log('Creating PanelManifest attributes...');
    await safeCreate(() => databases.createStringAttribute(dbId, 'panel_manifests', 'chapterId', 255, true));
    await safeCreate(() => databases.createStringAttribute(dbId, 'panel_manifests', 'mangaId', 255, true));
    await safeCreate(() => databases.createIntegerAttribute(dbId, 'panel_manifests', 'pageNumber', true));
    await safeCreate(() => databases.createStringAttribute(dbId, 'panel_manifests', 'imageUrl', 1000, true));
    await safeCreate(() => databases.createStringAttribute(dbId, 'panel_manifests', 'status', 50, false, 'pending_detection'));
    await safeCreate(() => databases.createStringAttribute(dbId, 'panel_manifests', 'detectedPanels', 1000000, false));
    await safeCreate(() => databases.createStringAttribute(dbId, 'panel_manifests', 'panels', 1000000, false));

    console.log('Done!');
}

setupAttributes();
