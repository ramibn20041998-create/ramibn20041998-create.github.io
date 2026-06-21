const { FieldValue } = require('../config/firebaseAdmin');
const ApiError = require('../utils/ApiError');

/** Converts a Pi amount to LAD using the given exchange rate (LAD per 1 Pi). */
function piToLad(piAmount, rate) {
  return round6(piAmount * rate);
}

/** Converts a LAD amount to Pi using the given exchange rate (LAD per 1 Pi). */
function ladToPi(ladAmount, rate) {
  return round6(ladAmount / rate);
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Debits LAD from a user inside an active Firestore transaction.
 * `currentBalance` must come from a `tx.get()` read performed earlier in the
 * SAME transaction so the check is based on a consistent snapshot.
 */
function debitLad(tx, userRef, currentBalance, amount) {
  if (amount <= 0) throw new ApiError(400, 'Invalid amount');
  if (currentBalance < amount) {
    throw new ApiError(400, 'Insufficient LAD balance');
  }
  tx.update(userRef, { ladBalance: FieldValue.increment(-amount) });
}

/** Credits LAD to a user inside an active Firestore transaction. */
function creditLad(tx, userRef, amount) {
  if (amount <= 0) throw new ApiError(400, 'Invalid amount');
  tx.update(userRef, { ladBalance: FieldValue.increment(amount) });
}

module.exports = { piToLad, ladToPi, debitLad, creditLad, round6 };
