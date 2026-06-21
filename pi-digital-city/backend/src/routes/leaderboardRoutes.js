const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const leaderboardService = require('../services/leaderboardService');

const router = express.Router();

router.get(
  '/richest',
  asyncHandler(async (req, res) => {
    res.json({ success: true, users: await leaderboardService.richestUsers() });
  })
);

router.get(
  '/largest-owners',
  asyncHandler(async (req, res) => {
    res.json({ success: true, users: await leaderboardService.largestLandOwners() });
  })
);

router.get(
  '/highest-level',
  asyncHandler(async (req, res) => {
    res.json({ success: true, lands: await leaderboardService.highestLevelLands() });
  })
);

router.get(
  '/most-valuable',
  asyncHandler(async (req, res) => {
    res.json({ success: true, listings: await leaderboardService.mostValuableLands() });
  })
);

module.exports = router;
