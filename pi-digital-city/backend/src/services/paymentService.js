const { db, FieldValue } = require('../config/firebaseAdmin');
const ApiError = require('../utils/ApiError');
const { creditLad, piToLad, round6 } = require('./ladService');
const { logTransaction } = require('./transactionService');
const { getSettings } = require('./settingsService');
const { incrementPiRevenue } = require('./cityStatsService');
const { TX_TYPES } = require('../config/constants');

const piPaymentsCol = db.collection('piPayments');
const usersCol = db.collection('users');

/**
 * Called when the Pi SDK reports `onReadyForServerApproval`. We record the
 * pending payment BEFORE approving it so that even if the server crashes
 * mid-flow there is a durable record to reconcile against.
 */
async function recordPendingPayment(uid, paymentId, piPaymentData) {
  const ref = piPaymentsCol.doc(paymentId);
  const existing = await ref.get();
  if (existing.exists) return existing.data(); // already recorded - idempotent

  const settings = await getSettings();
  const piAmount = piPaymentData.amount;
  const ladAmount = piToLad(piAmount, settings.piToLadRate);

  const record = {
    paymentId,
    uid,
    piAmount,
    ladAmount,
    memo: piPaymentData.memo || '',
    status: 'pending_approval',
    createdAt: FieldValue.serverTimestamp(),
  };
  await ref.set(record);
  return record;
}

async function markApproved(paymentId) {
  await piPaymentsCol.doc(paymentId).update({ status: 'approved', approvedAt: FieldValue.serverTimestamp() });
}

/**
 * Completes a Pi payment and credits LAD exactly once. Cross-checks the
 * amount reported by the Pi Platform against what we recorded at approval
 * time to guard against any client-side tampering with the request.
 */
async function completePiPurchase(paymentId, txid, piPlatformRecord) {
  const ref = piPaymentsCol.doc(paymentId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'Payment record not found');
    const record = snap.data();

    if (record.status === 'completed') {
      // Already credited - return success without crediting twice (anti double-spend)
      return { alreadyCompleted: true, ladAmount: record.ladAmount };
    }

    const reportedAmount = piPlatformRecord.amount;
    if (Math.abs(reportedAmount - record.piAmount) > 1e-6) {
      tx.update(ref, { status: 'amount_mismatch', txid, completedAt: FieldValue.serverTimestamp() });
      throw new ApiError(400, 'Payment amount does not match the original request');
    }

    const userRef = usersCol.doc(record.uid);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new ApiError(404, 'User not found');

    creditLad(tx, userRef, record.ladAmount);
    tx.update(userRef, { piSpent: FieldValue.increment(record.piAmount) });
    incrementPiRevenue(tx, record.piAmount);

    tx.update(ref, { status: 'completed', txid, completedAt: FieldValue.serverTimestamp() });

    logTransaction(tx, {
      uid: record.uid,
      type: TX_TYPES.PI_PURCHASE,
      amountLad: record.ladAmount,
      amountPi: record.piAmount,
      metadata: { paymentId, txid },
    });

    return { alreadyCompleted: false, ladAmount: record.ladAmount };
  });
}

async function markFailed(paymentId, reason) {
  await piPaymentsCol.doc(paymentId).set({ status: 'failed', failReason: reason, failedAt: FieldValue.serverTimestamp() }, { merge: true });
}

module.exports = { recordPendingPayment, markApproved, completePiPurchase, markFailed, piPaymentsCol };
