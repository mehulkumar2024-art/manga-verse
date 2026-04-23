const admin = require('firebase-admin');

const hasCredentials = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL;

if (!admin.apps.length) {
  if (hasCredentials) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    console.log('✅ Firebase Admin SDK initialized');
  } else {
    console.warn('⚠️ Firebase credentials missing. Running in developer mode without auth verify.');
  }
}

module.exports = admin;
