import { doc, setDoc } from "firebase/firestore";
import { db } from "./firestoreConfig";

export const createNewUserProfile = async (uid: string, name: string) => {
  const userRef = doc(db, "users", uid); // Uses the UID as the Document ID
  
  await setDoc(userRef, {
    uid: uid,
    name: name,
    points: 0,
    itemsRecycled: 0,
    createdAt: new Date(),
  }, { merge: true });
};