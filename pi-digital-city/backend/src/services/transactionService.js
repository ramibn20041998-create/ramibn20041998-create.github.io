const { db, FieldValue } = require('../config/firebaseAdmin');

const txCol = db.collection('transactions');

/**
 * Writes an immutable transaction log entry. Pass an active Firestore
 * `tx` to make the log atomic with whatever balance change it documents;
 * omit it for fire-and-forget logging outside a transaction.
 */
function logTransaction(tx, { uid, type, amountLad = 0, amountPi = 0, status = 'completed', metadata = {} }) {
  const ref = txCol.doc();
  const entry = {
    uid,
    type,
    amountLad,
    amountPi,
    status,
    metadata,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (tx) {
    tx.set(ref, entry);
  } else {
    return ref.set(entry);
  }
  return ref;
}

module.exports = { txCol, logTransaction };
