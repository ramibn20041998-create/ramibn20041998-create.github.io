const express = require('express');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../services/piPlatformService');
const { findOrCreateUser, getUserOrThrow } = require('../services/userService');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Body: { accessToken } - the token returned by Pi.authenticate() in the frontend.
 * We verify it server-side against the Pi Platform before trusting any of it.
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) throw new ApiError(400, 'accessToken is required');

    const piUser = await verifyAccessToken(accessToken); // { uid, username, ... }
    const user = await findOrCreateUser(piUser.uid, piUser.username);

    const token = jwt.sign({ uid: user.uid }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({ success: true, token, user });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUserOrThrow(req.user.uid);
    res.json({ success: true, user });
  })
);

module.exports = router;
