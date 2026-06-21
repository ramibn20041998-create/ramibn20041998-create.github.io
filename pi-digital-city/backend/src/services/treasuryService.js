const { db, FieldValue } = require('../config/firebaseAdmin');

const treasuryRef = db.collection('settings').doc('treasury');

/** Credits the platform treasury inside an active Firestore transaction. */
function creditTreasury(tx, amountLad, context = {}) {
  if (amountLad <= 0) return;
  tx.set(
    treasuryRef,
    {
      totalLadRevenue: FieldValue.increment(amountLad),
      lastCreditedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const logRef = treasuryRef.collection('ledger').doc();
  tx.set(logRef, {
    amountLad,
    ...context,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function getTreasury() {
  const snap = await treasuryRef.get();
  return snap.exists ? snap.data() : { totalLadRevenue: 0 };
}

module.exports = { creditTreasury, getTreasury, treasuryRef };
