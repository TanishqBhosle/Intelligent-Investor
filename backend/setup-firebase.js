// Firebase Setup Helper
// This script helps you set up Firebase service account credentials

console.log(`
🔥 FIREBASE SETUP INSTRUCTIONS

You've provided the Firebase web app config, but the backend needs 
service account credentials for server-side access.

STEPS TO GET FIREBASE SERVICE ACCOUNT KEYS:

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: "the-intelligent-investor-d54fd"
3. Click on ⚙️ Settings → Project settings
4. Go to "Service accounts" tab
5. Click "Generate new private key"
6. Download the JSON file
7. Copy the contents to your .env file

REQUIRED ENV VARIABLES:
FIREBASE_PROJECT_ID=the-intelligent-investor-d54fd
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_ACTUAL_PRIVATE_KEY\\n-----END PRIVATE KEY-----\\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@the-intelligent-investor-d54fd.iam.gserviceaccount.com

Your current project ID: the-intelligent-investor-d54fd
Your web app API key: AIzaSyCV1O6tt8asFu7fImFeT7ukXGZ5KqnFM_k

NOTE: The web app API key is different from service account credentials!
Service account keys give server-side admin access to Firestore.
`);

const firebaseConfig = {
  apiKey: "AIzaSyCV1O6tt8asFu7fImFeT7ukXGZ5KqnFM_k",
  authDomain: "the-intelligent-investor-d54fd.firebaseapp.com",
  projectId: "the-intelligent-investor-d54fd",
  storageBucket: "the-intelligent-investor-d54fd.firebasestorage.app",
  messagingSenderId: "1062260691275",
  appId: "1:1062260691275:web:a665d378c25ccac0be58ce",
  measurementId: "G-NYK3YDHDYQ"
};

console.log('✅ Firebase web config detected:');
console.log('Project ID:', firebaseConfig.projectId);
console.log('Auth Domain:', firebaseConfig.authDomain);
console.log('\n⚠️  You still need service account keys for backend access!');
