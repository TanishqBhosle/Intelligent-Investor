// Firebase configuration for frontend
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCV1O6tt8asFu7fImFeT7ukXGZ5KqnFM_k",
  authDomain: "the-intelligent-investor-d54fd.firebaseapp.com",
  projectId: "the-intelligent-investor-d54fd",
  storageBucket: "the-intelligent-investor-d54fd.firebasestorage.app",
  messagingSenderId: "1062260691275",
  appId: "1:1062260691275:web:a665d378c25ccac0be58ce",
  measurementId: "G-NYK3YDHDYQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
export default firebaseConfig;
