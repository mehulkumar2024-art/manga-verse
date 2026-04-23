const { Client, Users, Databases, Storage } = require('node-appwrite');

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(client);
const databases = new Databases(client);
const storage = new Storage(client);

module.exports = {
    client,
    users,
    databases,
    storage
};
