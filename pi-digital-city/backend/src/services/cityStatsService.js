const { db, FieldValue } = require('../config/firebaseAdmin');

const statsRef = db.collection('settings').doc('cityStats');

function incrementLandsSold(tx, by = 1) {
  tx.set(statsRef, { totalLandsSold: FieldValue.increment(by) }, { merge: true });
}

function incrementPiRevenue(tx, piAmount) {
  tx.set(statsRef, { totalPiRevenue: FieldValue.increment(piAmount) }, { merge: true });
}

async function getCityStats() {
  const [statsSnap, landCountSnap, userCountSnap] = await Promise.all([
    statsRef.get(),
    db.collection('lands').count().get(),
    db.collection('users').count().get(),
  ]);

  return {
    totalLandsSold: statsSnap.exists ? statsSnap.data().totalLandsSold || 0 : 0,
    totalPiRevenue: statsSnap.exists ? statsSnap.data().totalPiRevenue || 0 : 0,
    totalLandsMinted: landCountSnap.data().count,
    totalUsers: userCountSnap.data().count,
  };
}

module.exports = { incrementLandsSold, incrementPiRevenue, getCityStats, statsRef };
