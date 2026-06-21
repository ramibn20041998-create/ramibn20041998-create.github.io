const { db, FieldValue } = require('../config/firebaseAdmin');

const burnStatsRef = db.collection('burnStats').doc('global');

/** Records a burn event inside an active Firestore transaction (atomic with the upgrade that caused it). */
function recordBurn(tx, amountLad, context = {}) {
  tx.set(
    burnStatsRef,
    {
      totalBurned: FieldValue.increment(amountLad),
      burnEventCount: FieldValue.increment(1),
      lastBurnAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Lightweight history trail for the admin dashboard, capped by created-at queries client-side
  const historyRef = db.collection('burnStats').doc('global').collection('history').doc();
  tx.set(historyRef, {
    amountLad,
    ...context,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function getBurnStats() {
  const snap = await burnStatsRef.get();
  return snap.exists ? snap.data() : { totalBurned: 0, burnEventCount: 0 };
}

module.exports = { recordBurn, getBurnStats, burnStatsRef };
