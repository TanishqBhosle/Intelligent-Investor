import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let db;

export function initFirebase() {
  if (!process.env.FIREBASE_PROJECT_ID) {
    throw new Error('Missing FIREBASE_PROJECT_ID in environment.');
  }
  if (!process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('Missing FIREBASE_PRIVATE_KEY in environment.');
  }
  if (!process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Missing FIREBASE_CLIENT_EMAIL in environment.');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }

  db = admin.firestore();
  return db;
}

export function getDb() {
  if (!db) throw new Error('Firebase not initialized. Call initFirebase() first.');
  return db;
}

