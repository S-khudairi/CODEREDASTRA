/**
 * weeklyAggregate.js
 * Small Node script that uses firebase-admin to compute weekly per-user summaries
 * from users/{uid}/dailyPoints/{YYYY-MM-DD} and writes users/{uid}/weekly/{YYYY-WW}
 * and leaderboards/weekly/{YYYY-WW}.
 *
 * This script is intended to be run from your backend (Express route or scheduled job).
 */
const admin = require('firebase-admin');
const { startOfWeek, endOfWeek, formatISO, parseISO, subDays } = require('date-fns');

if (!admin.apps.length) {
  // Initialize with default credentials (ensure env/service account is available)
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('Failed to initialize firebase-admin. Ensure service account or env is set.', e);
    process.exit(1);
  }
}

const db = admin.firestore();

// Helper: compute weekId like 2025-W42 (ISO week by monday start)
function weekIdFromDate(date) {
  // use YYYY-Www where ww is ISO week number; to keep things simple we'll use ISO week via toISOString week start
  const year = date.getUTCFullYear();
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const weekNum = Math.ceil(((+weekStart - +new Date(Date.UTC(year,0,1))) / 86400000 + new Date(Date.UTC(year,0,1)).getUTCDay()+1)/7);
  // fallback if weekNum computation is odd; use YYYY-MM-DD start date as ID
  return `W-${formatISO(weekStart, { representation: 'date' })}`;
}

async function listAllUsers() {
  const usersCol = db.collection('users');
  const snap = await usersCol.get();
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// returns doc data or null
async function getDailyPoint(uid, dateStr) {
  const ref = db.collection('users').doc(uid).collection('dailyPoints').doc(dateStr);
  const snap = await ref.get();
  return snap.exists ? snap.data() : null;
}

// compute startDate..endDate (strings YYYY-MM-DD)
function dateToISODate(dt) {
  return formatISO(dt, { representation: 'date' });
}

// Main: aggregate for the week that contains `baseDate` (Date object). If omitted use yesterday.
async function aggregateWeek({ baseDate = subDays(new Date(), 1), topN = 10 } = {}) {
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
  const weekId = weekIdFromDate(baseDate);
  const startDateStr = dateToISODate(weekStart);
  const endDateStr = dateToISODate(weekEnd);

  console.log(`Aggregating week ${weekId} from ${startDateStr} to ${endDateStr}`);

  const users = await listAllUsers();

  const candidates = [];
  for (const user of users) {
    const uid = user.uid;
    // read each day in the week
    const summaries = [];
    let itemsRecycledTotal = 0;
    let pointsAtEnd = null;
    let pointsAtStart = null;
    for (let d = new Date(weekStart); d <= weekEnd; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = dateToISODate(new Date(d));
      const dp = await getDailyPoint(uid, dateStr);
      if (dp) {
        summaries.push({ date: dateStr, ...dp });
        itemsRecycledTotal += dp.itemsRecycled || 0;
        pointsAtEnd = dp.points; // last found will be end
        if (!pointsAtStart) pointsAtStart = dp.points; // first found is start
      }
    }

    // fallback: if no daily docs, try to use user's current points from users collection
    if (pointsAtEnd === null) {
      pointsAtEnd = user.points || 0;
    }
    if (pointsAtStart === null) {
      // attempt to read the day before weekStart
      const dayBefore = dateToISODate(subDays(weekStart, 1));
      const beforeDoc = await getDailyPoint(uid, dayBefore);
      pointsAtStart = beforeDoc ? (beforeDoc.points || 0) : 0;
    }

    const pointsGained = (pointsAtEnd || 0) - (pointsAtStart || 0);

    // write per-user weekly doc later; collect candidate for leaderboard
    candidates.push({ uid, name: user.name || 'Anonymous', pointsStart: pointsAtStart, pointsEnd: pointsAtEnd, pointsGained, itemsRecycled: itemsRecycledTotal });
  }

  // sort by pointsGained descending
  candidates.sort((a, b) => b.pointsGained - a.pointsGained);
  const top = candidates.slice(0, topN).map((c, idx) => ({ rank: idx+1, uid: c.uid, name: c.name, pointsGained: c.pointsGained, pointsEnd: c.pointsEnd, itemsRecycled: c.itemsRecycled }));

  // batch write per-user weekly docs and leaderboard snapshot
  const batch = db.batch();
  for (const c of candidates) {
    const ref = db.collection('users').doc(c.uid).collection('weekly').doc(weekId);
    batch.set(ref, {
      week: weekId,
      startDate: startDateStr,
      endDate: endDateStr,
      pointsStart: c.pointsStart,
      pointsEnd: c.pointsEnd,
      pointsGained: c.pointsGained,
      itemsRecycled: c.itemsRecycled,
      generatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: false });
  }

  const lbRef = db.collection('leaderboards').doc('weekly').collection('snapshots').doc(weekId);
  batch.set(lbRef, {
    week: weekId,
    startDate: startDateStr,
    endDate: endDateStr,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    top
  }, { merge: false });

  await batch.commit();
  console.log(`Wrote weekly docs and leaderboard for ${weekId} (top ${top.length})`);
  return { weekId, topCount: top.length };
}

module.exports = { aggregateWeek };
