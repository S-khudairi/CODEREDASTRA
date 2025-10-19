// src/firebase/auth.ts

import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth as firebaseAuth } from "./firebaseConfig"; // Import the initialized auth object

export const signInUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return userCredential.user;
};

export const signUpUser = async (email: string, password: string, name: string) => {
  const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  // Optional: You could update the user's name here
  // await updateProfile(userCredential.user, { displayName: name });
  return userCredential.user;
};

export const logoutUser = async () => {
  await signOut(firebaseAuth);
};


