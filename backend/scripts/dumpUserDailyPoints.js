// backend/scripts/dumpUserDailyPoints.js
const admin = require('firebase-admin');
const fs = require('fs');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.SERVICE_ACCOUNT_KEY_PATH) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS or SERVICE_ACCOUNT_KEY_PATH (path to service account JSON)');
  process.exit(1);
}

const path = require('path');
let keyPath = process.env.SERVICE_ACCOUNT_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
// resolve relative paths from repository root
if (keyPath && !path.isAbsolute(keyPath)) {
  keyPath = path.resolve(__dirname, '..', keyPath);
}

if (!keyPath || !fs.existsSync(keyPath)) {
  console.error(`Service account key not found at ${keyPath}. Set SERVICE_ACCOUNT_KEY_PATH or GOOGLE_APPLICATION_CREDENTIALS to the absolute path of the JSON key.`);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });

const db = admin.firestore();

async function dump(uid, startDate, endDate) {
  const col = db.collection('users').doc(uid).collection('dailyPoints');
  let q = col.orderBy('date', 'asc');
  if (startDate) q = q.startAt(startDate);
  if (endDate) q = q.endAt(endDate);
  const snap = await q.get();
  const out = snap.docs.map(d => ({ id: d.id, ...(d.data()) }));
  console.log(JSON.stringify(out, null, 2));
}

const [,, uid, startDate, endDate] = process.argv;
if (!uid) {
  console.error('Usage: node dumpUserDailyPoints.js <uid> [startDate YYYY-MM-DD] [endDate YYYY-MM-DD]');
  process.exit(1);
}
dump(uid, startDate, endDate).catch(e => { console.error(e); process.exit(1); });