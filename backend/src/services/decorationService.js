const { db, FieldValue } = require('../config/firebaseAdmin');
const ApiError = require('../utils/ApiError');
const { debitLad } = require('./ladService');
const { logTransaction } = require('./transactionService');
const { creditTreasury } = require('./treasuryService');
const { TX_TYPES } = require('../config/constants');

const decorationsCol = db.collection('decorations');
const landsCol = db.collection('lands');
const usersCol = db.collection('users');

const DEFAULT_CATALOG = [
  { id: 'tree_oak', name: 'Oak Tree', priceLad: 0.01, type: 'tree', icon: '🌳' },
  { id: 'fountain_classic', name: 'Classic Fountain', priceLad: 0.03, type: 'fountain', icon: '⛲' },
  { id: 'road_cobblestone', name: 'Cobblestone Road', priceLad: 0.02, type: 'road', icon: '🛣️' },
  { id: 'statue_founder', name: "Founder's Statue", priceLad: 0.05, type: 'statue', icon: '🗽' },
  { id: 'lights_string', name: 'String Lights', priceLad: 0.015, type: 'lights', icon: '✨' },
];

/** Returns the live decoration catalog, seeding Firestore with defaults on first call. */
async function getCatalog() {
  const snap = await decorationsCol.get();
  if (snap.empty) {
    const batch = db.batch();
    DEFAULT_CATALOG.forEach((item) => batch.set(decorationsCol.doc(item.id), { ...item, active: true }));
    await batch.commit();
    return DEFAULT_CATALOG.map((d) => ({ ...d, active: true }));
  }
  return snap.docs.map((d) => d.data()).filter((d) => d.active !== false);
}

async function purchaseDecoration(uid, landId, decorationId) {
  const decoSnap = await decorationsCol.doc(decorationId).get();
  if (!decoSnap.exists || decoSnap.data().active === false) {
    throw new ApiError(404, 'Decoration not found');
  }
  const decoration = decoSnap.data();

  const landRef = landsCol.doc(landId);
  const userRef = usersCol.doc(uid);

  return db.runTransaction(async (tx) => {
    const [landSnap, userSnap] = await Promise.all([tx.get(landRef), tx.get(userRef)]);
    if (!landSnap.exists) throw new ApiError(404, 'Land not found');
    const land = landSnap.data();
    if (land.owner !== uid) throw new ApiError(403, 'You do not own this land');

    const userData = userSnap.data();
    debitLad(tx, userRef, userData.ladBalance, decoration.priceLad);
    creditTreasury(tx, decoration.priceLad, { source: TX_TYPES.DECORATION_PURCHASE, landId, decorationId });

    tx.update(landRef, {
      decorations: FieldValue.arrayUnion(decorationId),
      lastUpdated: FieldValue.serverTimestamp(),
    });

    logTransaction(tx, {
      uid,
      type: TX_TYPES.DECORATION_PURCHASE,
      amountLad: -decoration.priceLad,
      metadata: { landId, decorationId },
    });

    return { landId, decorationId, priceLad: decoration.priceLad };
  });
}

module.exports = { getCatalog, purchaseDecoration, DEFAULT_CATALOG };
