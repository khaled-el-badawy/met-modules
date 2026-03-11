/* ======================================
   Firebase Configuration
   ======================================
   
   خطوات الإعداد:
   1. اذهب إلى https://console.firebase.google.com
   2. أنشئ مشروع جديد (Create a project)
   3. أضف تطبيق ويب (Add app → Web)
   4. انسخ بيانات الـ config واستبدلها هنا بالأسفل
   5. فعّل Firestore Database من القائمة الجانبية
   6. فعّل Authentication → Sign-in method → Email/Password
   7. أضف حسابك من Authentication → Users → Add User
   
   ====================================== */

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCpWWbHuypdWtMMBrmY4M53leDGF2Hucc0",
  authDomain: "met-modules.firebaseapp.com",
  projectId: "met-modules",
  storageBucket: "met-modules.firebasestorage.app",
  messagingSenderId: "703081250023",
  appId: "1:703081250023:web:cd20869834c0ca1a273642",
  measurementId: "G-QDQL0M3P8P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
