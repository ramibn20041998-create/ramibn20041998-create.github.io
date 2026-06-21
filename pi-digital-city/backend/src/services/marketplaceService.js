const { db, FieldValue } = require('../config/firebaseAdmin');
const ApiError = require('../utils/ApiError');
const { getSettings } = require('./settingsService');
const { debitLad, creditLad, round6 } = require('./ladService');
const { logTransaction } = require('./transactionService');
const { creditTreasury } = require('./treasuryService');
const { incrementLandsSold } = require('./cityStatsService');
const { TX_TYPES } = require('../config/constants');

const landsCol = db.collection('lands');
const usersCol = db.collection('users');
const marketCol = db.collection('marketplace');

/** Lists an owned land for sale at a chosen LAD price. */
async function listLand(uid, landId, priceLad) {
  const settings = await getSettings();
  if (!(priceLad >= settings.minListingPriceLad && priceLad <= settings.maxListingPriceLad)) {
    throw new ApiError(400, `Price must be between ${settings.minListingPriceLad} and ${settings.maxListingPriceLad} LAD`);
  }

  const landRef = landsCol.doc(landId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(landRef);
    if (!snap.exists) throw new ApiError(404, 'Land not found');
    const land = snap.data();
    if (land.owner !== uid) throw new ApiError(403, 'You do not own this land');
    if (land.forSale) throw new ApiError(400, 'Land is already listed');

    const listingRef = marketCol.doc();
    tx.set(listingRef, {
      landId,
      x: land.x,
      y: land.y,
      sellerId: uid,
      sellerPiUsername: land.ownerPiUsername,
      level: land.level,
      priceLad,
      status: 'active',
      listedAt: FieldValue.serverTimestamp(),
    });

    tx.update(landRef, { forSale: true, salePrice: priceLad, activeListingId: listingRef.id, lastUpdated: FieldValue.serverTimestamp() });

    logTransaction(tx, { uid, type: TX_TYPES.LAND_LIST, metadata: { landId, priceLad } });

    return { listingId: listingRef.id, landId, priceLad };
  });
}

/** Cancels an active listing without selling. */
async function unlistLand(uid, landId) {
  const landRef = landsCol.doc(landId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(landRef);
    if (!snap.exists) throw new ApiError(404, 'Land not found');
    const land = snap.data();
    if (land.owner !== uid) throw new ApiError(403, 'You do not own this land');
    if (!land.forSale) throw new ApiError(400, 'Land is not currently listed');

    if (land.activeListingId) {
      const listingRef = marketCol.doc(land.activeListingId);
      tx.update(listingRef, { status: 'cancelled', cancelledAt: FieldValue.serverTimestamp() });
    }

    tx.update(landRef, { forSale: false, salePrice: null, activeListingId: FieldValue.delete(), lastUpdated: FieldValue.serverTimestamp() });
    logTransaction(tx, { uid, type: TX_TYPES.LAND_UNLIST, metadata: { landId } });

    return { landId };
  });
}

/** Buys a land that's actively listed on the marketplace; seller gets 90%, platform keeps 10%. */
async function buyListedLand(uid, landId) {
  const settings = await getSettings();
  const landRef = landsCol.doc(landId);
  const buyerRef = usersCol.doc(uid);

  return db.runTransaction(async (tx) => {
    const landSnap = await tx.get(landRef);
    if (!landSnap.exists) throw new ApiError(404, 'Land not found');
    const land = landSnap.data();

    if (!land.forSale || !land.activeListingId) throw new ApiError(400, 'This land is not for sale');
    if (land.owner === uid) throw new ApiError(400, 'You already own this land');

    const listingRef = marketCol.doc(land.activeListingId);
    const [listingSnap, buyerSnap, sellerSnap] = await Promise.all([
      tx.get(listingRef),
      tx.get(buyerRef),
      tx.get(usersCol.doc(land.owner)),
    ]);

    if (!listingSnap.exists || listingSnap.data().status !== 'active') {
      throw new ApiError(409, 'This listing is no longer available');
    }
    if (!sellerSnap.exists) throw new ApiError(404, 'Seller account not found');

    const price = land.salePrice;
    const fee = round6(price * settings.marketplaceFeePercent);
    const sellerProceeds = round6(price - fee);

    debitLad(tx, buyerRef, buyerSnap.data().ladBalance, price);
    creditLad(tx, usersCol.doc(land.owner), sellerProceeds);
    creditTreasury(tx, fee, { source: TX_TYPES.LAND_SELL, landId });
    incrementLandsSold(tx);

    tx.update(usersCol.doc(land.owner), { ownedLandCount: FieldValue.increment(-1) });
    tx.update(buyerRef, { ownedLandCount: FieldValue.increment(1) });

    tx.update(landRef, {
      owner: uid,
      ownerPiUsername: buyerSnap.data().piUsername,
      forSale: false,
      salePrice: null,
      activeListingId: FieldValue.delete(),
      purchaseDate: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
      // New owner starts fresh on profile fields - prevents inherited spam links
      name: `Plot ${land.x}-${land.y}`,
      description: '',
      websiteUrl: '',
    });

    tx.update(listingRef, { status: 'sold', soldAt: FieldValue.serverTimestamp(), buyerId: uid });

    logTransaction(tx, { uid, type: TX_TYPES.LAND_BUY_MARKET, amountLad: -price, metadata: { landId, fee } });
    logTransaction(tx, { uid: land.owner, type: TX_TYPES.LAND_SELL, amountLad: sellerProceeds, metadata: { landId, fee, buyerId: uid } });

    return { landId, price, fee, sellerProceeds };
  });
}

/**
 * Browses active listings with optional level/price filters and sorting.
 * Firestore can only orderBy the field used in an inequality filter, so
 * price-range searches sort by price and level-only searches sort by date.
 */
async function searchListings({ level, minPrice, maxPrice, sort = 'newest', pageSize = 24 }) {
  let q = marketCol.where('status', '==', 'active');

  if (level) q = q.where('level', '==', Number(level));
  if (minPrice != null) q = q.where('priceLad', '>=', Number(minPrice));
  if (maxPrice != null) q = q.where('priceLad', '<=', Number(maxPrice));

  const priceFiltered = minPrice != null || maxPrice != null;

  if (sort === 'cheapest') {
    q = q.orderBy('priceLad', 'asc');
  } else if (sort === 'expensive') {
    q = q.orderBy('priceLad', 'desc');
  } else if (priceFiltered) {
    // Firestore requires the first orderBy to match the inequality field
    q = q.orderBy('priceLad', 'asc');
  } else {
    q = q.orderBy('listedAt', 'desc');
  }

  const snap = await q.limit(pageSize).get();
  return snap.docs.map((d) => ({ listingId: d.id, ...d.data() }));
}

module.exports = { listLand, unlistLand, buyListedLand, searchListings };
