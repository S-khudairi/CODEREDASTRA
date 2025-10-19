/**
 * createMonthlyLeaderboard.js
 *
 * Creates a monthly leaderboard snapshot at leaderboards/monthly/snapshots/{YYYY-MM}
 * Usage: node createMonthlyLeaderboard.js [YYYY-MM]
 * If no month is provided the script uses the previous month.
 */

require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  try {
    const keyPathEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.SERVICE_ACCOUNT_KEY_PATH || process.env.SA_KEY_PATH;
    if (keyPathEnv) {
      const resolved = path.isAbsolute(keyPathEnv) ? keyPathEnv : path.join(__dirname, '..', keyPathEnv);
      const serviceAccount = require(resolved);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: serviceAccount.project_id });
    } else {
      admin.initializeApp();
    }
  } catch (e) {
    console.error('Failed to initialize firebase-admin', e);
    process.exit(1);
  }
}

const db = admin.firestore();
const { subMonths, format } = require('date-fns');

function monthIdFromArg(arg) {
  if (arg && /^\d{4}-\d{2}$/.test(arg)) return arg;
  const now = new Date();
  const prev = subMonths(now, 1);
  return format(prev, 'yyyy-MM');
}

async function createMonthly(monthId, topN = 10) {
  console.log(`Creating monthly leaderboard for ${monthId}`);

  const fakeMode = process.argv.includes('fake') || process.env.FAKE_LEADERBOARD === '1';

  if (fakeMode) {
    // Generate fake top-N quickly
    const sampleNames = ['Alex Lee','Sam Patel','Jordan Smith','Taylor Garcia','Morgan Kim','Casey Nguyen','Riley Johnson','Cameron Park','Avery Chen','Jamie Brown','Robin Davis','Quinn López'];
    const top = [];
    for (let i = 0; i < topN; i++) {
      const name = sampleNames[i % sampleNames.length];
      const pts = Math.floor(800 + Math.random() * 4200);
      top.push({ rank: i+1, uid: `fake-user-${i+1}`, name, initials: name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2), points: pts, itemsRecycled: Math.floor(Math.random()*200) });
    }
    const refFake = db.collection('leaderboards').doc('monthly').collection('snapshots').doc(monthId);
    await refFake.set({ month: monthId, generatedAt: admin.firestore.FieldValue.serverTimestamp(), top }, { merge: false });
    console.log(`Wrote fake leaderboard snapshot for ${monthId}`);
    return;
  }

  // Real aggregation using users' dailyPoints subcollections
  // monthId is YYYY-MM -> compute start and end dates
  const [year, month] = monthId.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0)); // last day of month
  const startStr = startDate.toISOString().slice(0,10);
  const endStr = endDate.toISOString().slice(0,10);

  console.log(`Aggregating dailyPoints between ${startStr} and ${endStr}`);

  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} users to evaluate`);

  const candidates = [];

  for (const udoc of usersSnap.docs) {
    const uid = udoc.id;

    // get last snapshot before month start (pointsStart)
    const beforeQ = db.collection('users').doc(uid).collection('dailyPoints')
      .where('date', '<', startStr).orderBy('date', 'desc').limit(1);
    const beforeSnap = await beforeQ.get();
    const pointsStart = beforeSnap.empty ? 0 : Number(beforeSnap.docs[0].data().points || 0);

    // get last snapshot within month (pointsEnd)
    const endQ = db.collection('users').doc(uid).collection('dailyPoints')
      .where('date', '<=', endStr).where('date', '>=', startStr).orderBy('date', 'desc').limit(1);
    const endSnap = await endQ.get();
    let pointsEnd = null;
    if (!endSnap.empty) {
      pointsEnd = Number(endSnap.docs[0].data().points || 0);
    } else {
      // fallback to current user points if no daily snapshot in month
      pointsEnd = Number(udoc.data().points || 0);
    }

    const pointsGained = pointsEnd - pointsStart;

    // sum itemsRecycled during month
    const itemsQ = db.collection('users').doc(uid).collection('dailyPoints')
      .where('date', '>=', startStr).where('date', '<=', endStr);
    const itemsSnap = await itemsQ.get();
    let itemsRecycledTotal = 0;
    for (const d of itemsSnap.docs) {
      itemsRecycledTotal += Number(d.data().itemsRecycled || 0);
    }

    const name = udoc.data().name || 'Anonymous';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);

    candidates.push({ uid, name, initials, pointsStart, pointsEnd, pointsGained, itemsRecycled: itemsRecycledTotal });
  }

  // sort by pointsGained desc
  candidates.sort((a,b) => b.pointsGained - a.pointsGained);
  const top = candidates.slice(0, topN).map((c, idx) => ({ rank: idx+1, uid: c.uid, name: c.name, initials: c.initials, pointsGained: c.pointsGained, pointsEnd: c.pointsEnd, itemsRecycled: c.itemsRecycled }));

  const ref = db.collection('leaderboards').doc('monthly').collection('snapshots').doc(monthId);
  await ref.set({ month: monthId, startDate: startStr, endDate: endStr, generatedAt: admin.firestore.FieldValue.serverTimestamp(), top }, { merge: false });
  console.log(`Wrote leaderboard snapshot for ${monthId}`);
}

const arg = process.argv[2];
const monthId = monthIdFromArg(arg);
createMonthly(monthId).catch(err => { console.error(err); process.exit(1); });
