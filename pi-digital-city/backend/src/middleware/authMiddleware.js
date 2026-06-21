const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { db } = require('../config/firebaseAdmin');

/**
 * Requires a valid backend session token (issued by POST /api/auth/login
 * after the Pi access token was verified against the Pi Platform API).
 *
 * Re-checks the user's ban status on every request from Firestore so a
 * ban takes effect immediately even with an unexpired JWT.
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) throw new ApiError(401, 'Missing authorization token');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    throw new ApiError(401, 'Invalid or expired session, please log in again');
  }

  const userDoc = await db.collection('users').doc(payload.uid).get();
  if (!userDoc.exists) throw new ApiError(401, 'User not found');

  const userData = userDoc.data();
  if (userData.isBanned) throw new ApiError(403, 'This account has been suspended');

  req.user = {
    uid: payload.uid,
    piUsername: userData.piUsername,
    isAdmin: !!userData.isAdmin,
  };
  req.userDoc = userData;

  next();
});

module.exports = { requireAuth };
