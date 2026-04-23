/**
 * Utility to map Appwrite documents ($id) to MongoDB style (_id)
 * so that the React frontend continues to work without needing massive refactoring.
 */
function mapDoc(doc) {
    if (!doc) return null;
    if (typeof doc !== 'object') return doc;
    
    // Create a new object to avoid mutating the original
    const mapped = { ...doc };
    
    // Map $id to _id
    if (mapped.$id) {
        mapped._id = mapped.$id;
    }
    
    // Remove internal Appwrite fields if desired (optional, but good for clean payloads)
    delete mapped.$databaseId;
    delete mapped.$collectionId;
    delete mapped.$permissions;

    // Recursively map nested objects or arrays
    for (const key in mapped) {
        if (Array.isArray(mapped[key])) {
            mapped[key] = mapped[key].map(item => mapDoc(item));
        } else if (typeof mapped[key] === 'object' && mapped[key] !== null) {
            mapped[key] = mapDoc(mapped[key]);
        }
    }
    
    return mapped;
}

/**
 * Maps an Appwrite DocumentList (which has .documents array)
 */
function mapList(list) {
    if (!list || !list.documents) return [];
    return list.documents.map(doc => mapDoc(doc));
}

module.exports = {
    mapDoc,
    mapList
};
