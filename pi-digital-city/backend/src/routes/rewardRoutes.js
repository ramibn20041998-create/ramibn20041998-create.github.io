const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/authMiddleware');
const rewardService = require('../services/rewardService');

const router = express.Router();

router.post(
  '/claim/:landId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await rewardService.claimLandReward(req.user.uid, req.params.landId);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/claim-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await rewardService.claimAllRewards(req.user.uid);
    res.json({ success: true, ...result });
  })
);

module.exports = router;
