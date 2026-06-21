const { db } = require('../config/firebaseAdmin');
const { toPublicProfile } = require('./userService');

const usersCol = db.collection('users');
const landsCol = db.collection('lands');

async function richestUsers(limit = 20) {
  const snap = await usersCol.orderBy('ladBalance', 'desc').limit(limit).get();
  return snap.docs.map((d) => toPublicProfile({ uid: d.id, ...d.data() }));
}

async function largestLandOwners(limit = 20) {
  const snap = await usersCol.orderBy('ownedLandCount', 'desc').limit(limit).get();
  return snap.docs.map((d) => toPublicProfile({ uid: d.id, ...d.data() }));
}

async function highestLevelLands(limit = 20) {
  const snap = await landsCol.orderBy('level', 'desc').orderBy('lastUpdated', 'desc').limit(limit).get();
  return snap.docs.map((d) => d.data());
}

/** "Most valuable" = highest active marketplace asking price, as a proxy for market-perceived value. */
async function mostValuableLands(limit = 20) {
  const snap = await db
    .collection('marketplace')
    .where('status', '==', 'active')
    .orderBy('priceLad', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ listingId: d.id, ...d.data() }));
}

module.exports = { richestUsers, largestLandOwners, highestLevelLands, mostValuableLands };
