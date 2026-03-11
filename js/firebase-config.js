// Firebase Configuration - MET Modules
const firebaseConfig = {
  apiKey: "AIzaSyCpWWbHuypdWtMMBrmY4M53leDGF2Hucc0",
  authDomain: "met-modules.firebaseapp.com",
  projectId: "met-modules",
  storageBucket: "met-modules.firebasestorage.app",
  messagingSenderId: "703081250023",
  appId: "1:703081250023:web:cd20869834c0ca1a273642",
  measurementId: "G-QDQL0M3P8P"
};

// Initialize Firebase (using compat SDK loaded via CDN)
firebase.initializeApp(firebaseConfig);

// Initialize services
const db = firebase.firestore();
const auth = firebase.auth();

// Set Arabic locale for auth
auth.languageCode = 'ar';