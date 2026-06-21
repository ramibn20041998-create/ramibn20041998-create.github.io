const { db, FieldValue } = require('../config/firebaseAdmin');
const ApiError = require('../utils/ApiError');

const usersCol = db.collection('users');

/**
 * Looks up a user by their Pi Network uid (used directly as the Firestore
 * document id so every collection can reference users consistently).
 * Creates the account on first login.
 */
async function findOrCreateUser(piUid, piUsername) {
  const ref = usersCol.doc(piUid);
  const snap = await ref.get();

  if (snap.exists) {
    await ref.update({
      lastLoginAt: FieldValue.serverTimestamp(),
      // Pi usernames can change; keep ours in sync
      piUsername,
    });
    return { uid: piUid, ...snap.data(), piUsername };
  }

  const seedAdmins = (process.env.SEED_ADMIN_USERNAMES || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const newUser = {
    piUsername,
    ladBalance: 0,
    piSpent: 0,
    totalRewardsClaimed: 0,
    ownedLandCount: 0,
    isAdmin: seedAdmins.includes(piUsername.toLowerCase()),
    isBanned: false,
    createdAt: FieldValue.serverTimestamp(),
    lastLoginAt: FieldValue.serverTimestamp(),
  };

  await ref.set(newUser);
  return { uid: piUid, ...newUser };
}

async function getUserOrThrow(uid) {
  const snap = await usersCol.doc(uid).get();
  if (!snap.exists) throw new ApiError(404, 'User not found');
  return { uid, ...snap.data() };
}

/** Strips sensitive/internal fields before sending a user to the public leaderboard, etc. */
function toPublicProfile(user) {
  return {
    uid: user.uid,
    piUsername: user.piUsername,
    ladBalance: user.ladBalance,
    ownedLandCount: user.ownedLandCount,
    totalRewardsClaimed: user.totalRewardsClaimed,
  };
}

module.exports = { usersCol, findOrCreateUser, getUserOrThrow, toPublicProfile };
