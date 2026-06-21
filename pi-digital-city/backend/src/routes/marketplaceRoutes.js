const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { requireAuth } = require('../middleware/authMiddleware');
const marketplaceService = require('../services/marketplaceService');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { level, minPrice, maxPrice, sort } = req.query;
    const listings = await marketplaceService.searchListings({ level, minPrice, maxPrice, sort });
    res.json({ success: true, listings });
  })
);

router.post(
  '/list',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { landId, priceLad } = req.body;
    if (!landId || !priceLad) throw new ApiError(400, 'landId and priceLad are required');
    const result = await marketplaceService.listLand(req.user.uid, landId, Number(priceLad));
    res.json({ success: true, ...result });
  })
);

router.post(
  '/unlist',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { landId } = req.body;
    if (!landId) throw new ApiError(400, 'landId is required');
    const result = await marketplaceService.unlistLand(req.user.uid, landId);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/buy',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { landId } = req.body;
    if (!landId) throw new ApiError(400, 'landId is required');
    const result = await marketplaceService.buyListedLand(req.user.uid, landId);
    res.json({ success: true, ...result });
  })
);

module.exports = router;
