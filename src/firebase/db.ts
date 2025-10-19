import { collection, doc, getDocs, limit, orderBy, query, setDoc, serverTimestamp } from "firebase/firestore";
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

/**
 * Save a per-day snapshot of a user's points and items recycled.
 * Stores the document at users/{uid}/dailyPoints/{YYYY-MM-DD} (UTC date)
 *
 * This function is meant to be called whenever you want to persist the user's
 * current points total for that day. For weekly views you should store cumulative
 * points (i.e. total points at snapshot time) so deltas can be computed later.
 */
export const saveDailyPoints = async (uid: string, points: number, itemsRecycled: number = 0, date?: Date) => {
  const d = date ? new Date(date) : new Date();
  // Use UTC date string YYYY-MM-DD so doc IDs sort lexicographically
  const dateStr = d.toISOString().slice(0, 10);
  const ref = doc(db, "users", uid, "dailyPoints", dateStr);

  await setDoc(ref, {
    date: dateStr,
    points,
    itemsRecycled,
    generatedAt: serverTimestamp()
  }, { merge: true });
};

/**
 * Read the most recent N dailyPoints documents for a user (default 7 days).
 * Returns an array sorted ascending by date (oldest -> newest) which is convenient
 * for charting a weekly progress line.
 */
export const getUserWeeklyPoints = async (uid: string, days: number = 7) => {
  const colRef = collection(db, "users", uid, "dailyPoints");
  // request days + 1 so callers can compute deltas (we need the snapshot immediately before the range)
  // order by 'date' field to use a composite index if needed
  const q = query(colRef, orderBy("date", "desc"), limit(days + 1));
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ date: d.id, ...(d.data() as any) }));
  // return oldest -> newest (useful for chart x-axis); includes one extra previous day if present
  return items.reverse();
};