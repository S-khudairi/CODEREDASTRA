import { getFirestore } from "firebase/firestore";
import { app } from "./firebaseConfig"; // Import the initialized app

export const db = getFirestore(app);