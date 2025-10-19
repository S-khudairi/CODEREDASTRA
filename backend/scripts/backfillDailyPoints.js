/**
 * backfillDailyPoints.js
 *
 * Usage:
 *   node backfillDailyPoints.js [YYYY-MM-DD]
 * If no date is provided the script uses today's UTC date.
 *
 * The script reads all documents under `users` and writes a doc at
 * users/{uid}/dailyPoints/{YYYY-MM-DD} with fields { date, points, itemsRecycled, generatedAt }
 * It uses batched writes (500 writes per batch) so it's safe for large collections.
 */

// load .env so you can set SERVICE_ACCOUNT_KEY_PATH or GOOGLE_APPLICATION_CREDENTIALS there
require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  try {
    const keyPathEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.SERVICE_ACCOUNT_KEY_PATH || process.env.SA_KEY_PATH;
    if (keyPathEnv) {
      // resolve relative paths relative to backend/ directory
      const resolved = path.isAbsolute(keyPathEnv) ? keyPathEnv : path.join(__dirname, '..', keyPathEnv);
      // require the json key
      const serviceAccount = require(resolved);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    } else {
      // fallback to default application credentials
      admin.initializeApp();
    }
  } catch (e) {
    console.error('Failed to initialize firebase-admin. Make sure SERVICE_ACCOUNT_KEY_PATH or GOOGLE_APPLICATION_CREDENTIALS is set in .env or environment.');
    console.error(e);
    process.exit(1);
  }
}

const db = admin.firestore();

function toDateId(d) {
  return d.toISOString().slice(0, 10);
}

async function backfill(dateStr, extraDays = 6) {
  console.log(`Backfilling dailyPoints for date ${dateStr} and previous ${extraDays} days...`);

  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} users`);

  const writesPerBatch = 450; // keep under 500
  let batch = db.batch();
  let writeCount = 0;
  let batchCount = 0;
  let totalWritesPlanned = 0;

  // number of days to create per user = extraDays + 1 (inclusive of dateStr)
  const daysCount = Number(extraDays) + 1;
  totalWritesPlanned = usersSnap.size * daysCount;
  console.log(`Planned writes: ~${totalWritesPlanned}`);

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const data = userDoc.data();
    const currentPoints = Number(data.points || 0);
    const itemsRecycledBase = Number(data.itemsRecycled || 0);

    // Build a sensible increasing cumulative series for the week.
    // Start points a bit lower than currentPoints so the week shows growth.
    const maxBackdrop = Math.max(50, Math.floor(daysCount * 30));
    const startPoints = Math.max(0, currentPoints - Math.floor(Math.random() * maxBackdrop));

    // Generate daily increments (0..50) for each day
    const increments = [];
    let cumulative = startPoints;
    for (let i = 0; i < daysCount; i++) {
      const inc = Math.floor(Math.random() * 51); // 0..50
      increments.push(inc);
    }

    // write from oldest -> newest (so earlier dates have smaller totals)
    for (let i = daysCount - 1; i >= 0; i--) {
      const dt = new Date(dateStr + 'T00:00:00Z');
      dt.setUTCDate(dt.getUTCDate() - i);
      const dStr = toDateId(dt);

      // compute cumulative for this day by summing increments up to this day index
      // Find index in increments for relative day (oldest = 0)
      const dayIndex = daysCount - 1 - i; // oldest=0
      cumulative = startPoints + increments.slice(0, dayIndex + 1).reduce((s, n) => s + n, 0);

      const itemsRecycled = itemsRecycledBase + Math.floor(Math.random() * 5); // small variation

      const ref = db.collection('users').doc(uid).collection('dailyPoints').doc(dStr);
      batch.set(ref, {
        date: dStr,
        points: cumulative,
        itemsRecycled,
        generatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      writeCount++;

      if (writeCount >= writesPerBatch) {
        batchCount++;
        console.log(`Committing batch #${batchCount} (${writeCount} writes)`);
        await batch.commit();
        // reset
        batch = db.batch();
        writeCount = 0;
      }
    }
  }

  if (writeCount > 0) {
    batchCount++;
    console.log(`Committing final batch #${batchCount} (${writeCount} writes)`);
    await batch.commit();
  }

  console.log('Backfill complete');
}

const arg = process.argv[2];
let dateStr;
if (arg) {
  // basic validation YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
    console.error('Date must be in YYYY-MM-DD format');
    process.exit(1);
  }
  dateStr = arg;
} else {
  dateStr = toDateId(new Date());
}

backfill(dateStr).catch(err => {
  console.error('Backfill failed', err);
  process.exit(1);
});
