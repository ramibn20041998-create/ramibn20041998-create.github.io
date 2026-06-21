const admin = require('firebase-admin');

let app;

function buildCredential() {
  // Preferred on Render: individual env vars (no file upload needed)
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Render env vars store \n as literal characters - convert back to real newlines
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }
  // Fallback: GOOGLE_APPLICATION_CREDENTIALS file path (local dev)
  return admin.credential.applicationDefault();
}

function getFirebaseApp() {
  if (!app) {
    app = admin.initializeApp({
      credential: buildCredential(),
    });
  }
  return app;
}

const db = getFirebaseApp().firestore();
db.settings({ ignoreUndefinedProperties: true });

const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

module.exports = { admin, db, FieldValue, Timestamp };
