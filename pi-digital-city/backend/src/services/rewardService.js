const { db, FieldValue } = require('../config/firebaseAdmin');
const ApiError = require('../utils/ApiError');
const { getSettings } = require('./settingsService');
const { computePendingReward } = require('./landService');
const { creditLad, round6 } = require('./ladService');
const { logTransaction } = require('./transactionService');
const { TX_TYPES } = require('../config/constants');

const landsCol = db.collection('lands');
const usersCol = db.collection('users');
const rewardsCol = db.collection('rewards');

async function claimLandReward(uid, landId) {
  const landRef = landsCol.doc(landId);
  const userRef = usersCol.doc(uid);
  const settings = await getSettings();

  const result = await db.runTransaction(async (tx) => {
    const landSnap = await tx.get(landRef);
    if (!landSnap.exists) throw new ApiError(404, 'Land not found');
    const landData = landSnap.data();
    if (landData.owner !== uid) throw new ApiError(403, 'You do not own this land');

    const pending = computePendingReward(landData, settings.dailyRewardRates);
    if (pending <= 0) throw new ApiError(400, 'No rewards available to claim yet');

    tx.update(landRef, {
      accruedRewardLad: 0,
      lastRewardCheckpoint: FieldValue.serverTimestamp(),
    });
    creditLad(tx, userRef, pending);
    tx.update(userRef, { totalRewardsClaimed: FieldValue.increment(pending) });

    logTransaction(tx, {
      uid,
      type: TX_TYPES.CLAIM_REWARD,
      amountLad: pending,
      metadata: { landId },
    });

    const rewardLogRef = rewardsCol.doc();
    tx.set(rewardLogRef, {
      uid,
      landId,
      amountLad: pending,
      claimedAt: FieldValue.serverTimestamp(),
    });

    return { landId, claimedLad: pending };
  });

  return result;
}

/** Claims rewards across every land the user owns in one batch. */
async function claimAllRewards(uid) {
  const settings = await getSettings();
  const ownedSnap = await landsCol.where('owner', '==', uid).get();

  const claimable = ownedSnap.docs.filter((d) => computePendingReward(d.data(), settings.dailyRewardRates) > 0);
  if (claimable.length === 0) {
    return { claimedLad: 0, landsClaimed: 0 };
  }

  // Firestore transactions cap at 500 writes; chunk defensively for large portfolios
  const chunks = [];
  for (let i = 0; i < claimable.length; i += 100) chunks.push(claimable.slice(i, i + 100));

  let totalClaimed = 0;
  const userRef = usersCol.doc(uid);

  for (const chunk of chunks) {
    const claimedThisChunk = await db.runTransaction(async (tx) => {
      let sum = 0;
      const freshDocs = await Promise.all(chunk.map((d) => tx.get(d.ref)));
      freshDocs.forEach((snap, idx) => {
        if (!snap.exists) return;
        const data = snap.data();
        if (data.owner !== uid) return;
        const pending = computePendingReward(data, settings.dailyRewardRates);
        if (pending <= 0) return;
        sum = round6(sum + pending);
        tx.update(snap.ref, { accruedRewardLad: 0, lastRewardCheckpoint: FieldValue.serverTimestamp() });
        const rewardLogRef = rewardsCol.doc();
        tx.set(rewardLogRef, { uid, landId: chunk[idx].id, amountLad: pending, claimedAt: FieldValue.serverTimestamp() });
      });

      if (sum > 0) {
        creditLad(tx, userRef, sum);
        tx.update(userRef, { totalRewardsClaimed: FieldValue.increment(sum) });
        logTransaction(tx, { uid, type: TX_TYPES.CLAIM_REWARD, amountLad: sum, metadata: { batch: true, count: freshDocs.length } });
      }
      return sum;
    });
    totalClaimed = round6(totalClaimed + claimedThisChunk);
  }

  return { claimedLad: totalClaimed, landsClaimed: claimable.length };
}

module.exports = { claimLandReward, claimAllRewards };
