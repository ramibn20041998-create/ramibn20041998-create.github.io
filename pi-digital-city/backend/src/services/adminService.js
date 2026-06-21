const { db, FieldValue } = require('../config/firebaseAdmin');
const ApiError = require('../utils/ApiError');
const { getBurnStats } = require('./burnService');
const { getTreasury } = require('./treasuryService');
const { getCityStats } = require('./cityStatsService');

const usersCol = db.collection('users');
const marketCol = db.collection('marketplace');
const landsCol = db.collection('lands');

async function setUserBanned(uid, banned) {
  const ref = usersCol.doc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, 'User not found');
  await ref.update({ isBanned: banned, banUpdatedAt: FieldValue.serverTimestamp() });
  return { uid, isBanned: banned };
}

/** Force-removes a listing (e.g. fraudulent or abusive content) and unlists the underlying land. */
async function removeListing(listingId, reason = 'Removed by admin') {
  const listingRef = marketCol.doc(listingId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(listingRef);
    if (!snap.exists) throw new ApiError(404, 'Listing not found');
    const listing = snap.data();

    tx.update(listingRef, { status: 'removed', removedReason: reason, removedAt: FieldValue.serverTimestamp() });

    const landRef = landsCol.doc(listing.landId);
    tx.update(landRef, { forSale: false, salePrice: null, activeListingId: FieldValue.delete() });

    return { listingId, landId: listing.landId };
  });
}

async function getAdminOverview() {
  const [burn, treasury, city] = await Promise.all([getBurnStats(), getTreasury(), getCityStats()]);
  return {
    totalBurnedLad: burn.totalBurned || 0,
    totalTreasuryLad: treasury.totalLadRevenue || 0,
    totalPiRevenue: city.totalPiRevenue || 0,
    totalLandsSold: city.totalLandsSold || 0,
    totalLandsMinted: city.totalLandsMinted || 0,
    totalUsers: city.totalUsers || 0,
  };
}

module.exports = { setUserBanned, removeListing, getAdminOverview };
