// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD4Q-C0G-KaBeRvvJSC_fAXBcfWyt8dkp8",
  authDomain: "ecoscan-8a754.firebaseapp.com",
  projectId: "ecoscan-8a754",
  storageBucket: "ecoscan-8a754.firebasestorage.app",
  messagingSenderId: "1058488421183",
  appId: "1:1058488421183:web:84990f491d740208ed218a",
  measurementId: "G-YW7PW8JX73"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// 3. Initialize the Auth service AND EXPORT IT
export const auth = getAuth(app); // <-- The critical line with 'export'