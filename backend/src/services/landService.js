const { db, FieldValue, Timestamp } = require('../config/firebaseAdmin');
const ApiError = require('../utils/ApiError');
const { CITY_GRID_WIDTH, CITY_GRID_HEIGHT, MAX_LEVEL, TX_TYPES } = require('../config/constants');
const { getSettings } = require('./settingsService');
const { debitLad, round6 } = require('./ladService');
const { logTransaction } = require('./transactionService');
const { recordBurn } = require('./burnService');
const { creditTreasury } = require('./treasuryService');
const { incrementLandsSold } = require('./cityStatsService');

const landsCol = db.collection('lands');
const usersCol = db.collection('users');

function landIdFromCoords(x, y) {
  return `${x}-${y}`;
}

function validateCoords(x, y) {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= CITY_GRID_WIDTH ||
    y >= CITY_GRID_HEIGHT
  ) {
    throw new ApiError(400, `Coordinates must be integers within 0-${CITY_GRID_WIDTH - 1}, 0-${CITY_GRID_HEIGHT - 1}`);
  }
}

/** Days (fractional) elapsed since a Firestore Timestamp, floored at 0. */
function daysSince(timestamp) {
  if (!timestamp) return 0;
  const ms = Date.now() - timestamp.toMillis();
  return Math.max(0, ms / (1000 * 60 * 60 * 24));
}

/** Computes total unclaimed reward for a land document at this instant. */
function computePendingReward(landData, dailyRewardRates) {
  const rate = dailyRewardRates[landData.level] || 0;
  const sinceCheckpoint = daysSince(landData.lastRewardCheckpoint) * rate;
  return round6((landData.accruedRewardLad || 0) + sinceCheckpoint);
}

/** Returns a land's stored document, or a synthetic "empty, unowned" shape if it has never been minted. */
async function getLand(landId) {
  const [xStr, yStr] = landId.split('-');
  const x = Number(xStr);
  const y = Number(yStr);
  validateCoords(x, y);

  const snap = await landsCol.doc(landId).get();
  if (!snap.exists) {
    return {
      landId,
      x,
      y,
      owner: null,
      level: 0, // 0 = never minted (distinct from level 1 "Empty Plot" which IS owned)
      forSale: false,
      minted: false,
    };
  }
  const data = snap.data();
  const settings = await getSettings();
  return {
    landId,
    ...data,
    minted: true,
    pendingReward: data.owner ? computePendingReward(data, settings.dailyRewardRates) : 0,
  };
}

/**
 * Primary purchase ("minting") of a never-before-owned plot directly from the city.
 * This is the only way new land documents come into existence, and it is gated
 * purely by coordinate bounds - so total supply can never exceed the fixed grid.
 */
async function buyPrimaryLand(uid, x, y) {
  validateCoords(x, y);
  const landId = landIdFromCoords(x, y);
  const landRef = landsCol.doc(landId);
  const userRef = usersCol.doc(uid);
  const settings = await getSettings();

  return db.runTransaction(async (tx) => {
    const [landSnap, userSnap] = await Promise.all([tx.get(landRef), tx.get(userRef)]);

    if (landSnap.exists) {
      throw new ApiError(409, 'This land has already been claimed by another user');
    }
    if (!userSnap.exists) throw new ApiError(404, 'User not found');

    const userData = userSnap.data();
    const price = settings.landPriceLad;

    debitLad(tx, userRef, userData.ladBalance, price);
    tx.update(userRef, { ownedLandCount: FieldValue.increment(1) });

    const landData = {
      landId,
      x,
      y,
      owner: uid,
      ownerPiUsername: userData.piUsername,
      level: 1,
      name: `Plot ${x}-${y}`,
      description: '',
      imageUrl: '',
      websiteUrl: '',
      forSale: false,
      salePrice: null,
      accruedRewardLad: 0,
      lastRewardCheckpoint: FieldValue.serverTimestamp(),
      decorations: [],
      purchaseDate: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
    };
    tx.set(landRef, landData);

    logTransaction(tx, {
      uid,
      type: TX_TYPES.LAND_BUY_PRIMARY,
      amountLad: -price,
      metadata: { landId, x, y },
    });

    creditTreasury(tx, price, { source: TX_TYPES.LAND_BUY_PRIMARY, landId });
    incrementLandsSold(tx);

    return { landId, x, y, level: 1, price };
  });
}

/** Upgrades a land one level, charging the upgrade cost and burning 30% of it. */
async function upgradeLand(uid, landId) {
  const landRef = landsCol.doc(landId);
  const userRef = usersCol.doc(uid);
  const settings = await getSettings();

  return db.runTransaction(async (tx) => {
    const [landSnap, userSnap] = await Promise.all([tx.get(landRef), tx.get(userRef)]);
    if (!landSnap.exists) throw new ApiError(404, 'Land not found');
    const landData = landSnap.data();
    if (landData.owner !== uid) throw new ApiError(403, 'You do not own this land');
    if (landData.level >= MAX_LEVEL) throw new ApiError(400, 'Land is already at maximum level');
    if (landData.forSale) throw new ApiError(400, 'Unlist this land from the marketplace before upgrading it');

    const userData = userSnap.data();
    const nextLevel = landData.level + 1;
    const cost = settings.upgradeCosts[nextLevel];
    if (cost == null) throw new ApiError(500, 'Upgrade cost not configured for this level');

    debitLad(tx, userRef, userData.ladBalance, cost);

    const burnAmount = round6(cost * settings.burnPercent);
    const treasuryAmount = round6(cost - burnAmount);

    recordBurn(tx, burnAmount, { reason: 'upgrade', landId, toLevel: nextLevel });
    creditTreasury(tx, treasuryAmount, { source: TX_TYPES.UPGRADE, landId });

    // Checkpoint rewards earned under the OLD level's rate before switching rates
    const pendingUnderOldLevel = computePendingReward(landData, settings.dailyRewardRates);

    tx.update(landRef, {
      level: nextLevel,
      accruedRewardLad: pendingUnderOldLevel,
      lastRewardCheckpoint: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
    });

    logTransaction(tx, {
      uid,
      type: TX_TYPES.UPGRADE,
      amountLad: -cost,
      metadata: { landId, toLevel: nextLevel, burnAmount, treasuryAmount },
    });

    return { landId, newLevel: nextLevel, cost, burnAmount };
  });
}

/** Lets the owner edit the cosmetic/profile fields of their land. */
async function updateLandProfile(uid, landId, { name, description, imageUrl, websiteUrl }) {
  const landRef = landsCol.doc(landId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(landRef);
    if (!snap.exists) throw new ApiError(404, 'Land not found');
    const data = snap.data();
    if (data.owner !== uid) throw new ApiError(403, 'You do not own this land');

    const update = { lastUpdated: FieldValue.serverTimestamp() };
    if (typeof name === 'string') update.name = name.slice(0, 60);
    if (typeof description === 'string') update.description = description.slice(0, 500);
    if (typeof imageUrl === 'string') update.imageUrl = imageUrl.slice(0, 1000);
    if (typeof websiteUrl === 'string') update.websiteUrl = websiteUrl.slice(0, 300);

    tx.update(landRef, update);
    return { landId, ...update };
  });
}

/** Range query for the city map - only returns lands that have actually been minted. */
async function getLandsInRegion(xMin, xMax, yMin, yMax) {
  validateCoords(xMin, yMin);
  validateCoords(Math.min(xMax, CITY_GRID_WIDTH - 1), Math.min(yMax, CITY_GRID_HEIGHT - 1));

  const snap = await landsCol
    .where('x', '>=', xMin)
    .where('x', '<=', xMax)
    .where('y', '>=', yMin)
    .where('y', '<=', yMax)
    .limit(2000)
    .get();

  return snap.docs.map((d) => d.data());
}

module.exports = {
  landsCol,
  landIdFromCoords,
  validateCoords,
  computePendingReward,
  getLand,
  buyPrimaryLand,
  upgradeLand,
  updateLandProfile,
  getLandsInRegion,
};
