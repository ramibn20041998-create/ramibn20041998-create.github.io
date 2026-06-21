const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { requireAuth } = require('../middleware/authMiddleware');
const landService = require('../services/landService');
const { db } = require('../config/firebaseAdmin');
const { getSettings } = require('../services/settingsService');

const router = express.Router();

/** Region query for the city map, e.g. /api/lands?xMin=0&xMax=49&yMin=0&yMax=49 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const xMin = Number(req.query.xMin ?? 0);
    const xMax = Number(req.query.xMax ?? 49);
    const yMin = Number(req.query.yMin ?? 0);
    const yMax = Number(req.query.yMax ?? 49);

    if (xMax - xMin > 99 || yMax - yMin > 99) {
      throw new ApiError(400, 'Region too large - request at most a 100x100 area at a time');
    }

    const lands = await landService.getLandsInRegion(xMin, xMax, yMin, yMax);
    res.json({ success: true, lands });
  })
);

router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const snap = await db.collection('lands').where('owner', '==', req.user.uid).get();
    const settings = await getSettings();
    const lands = snap.docs.map((d) => {
      const data = d.data();
      return { ...data, pendingReward: landService.computePendingReward(data, settings.dailyRewardRates) };
    });
    res.json({ success: true, lands });
  })
);

router.get(
  '/:landId',
  asyncHandler(async (req, res) => {
    const land = await landService.getLand(req.params.landId);
    res.json({ success: true, land });
  })
);

router.post(
  '/buy',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { x, y } = req.body;
    const result = await landService.buyPrimaryLand(req.user.uid, Number(x), Number(y));
    res.json({ success: true, ...result });
  })
);

router.post(
  '/:landId/upgrade',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await landService.upgradeLand(req.user.uid, req.params.landId);
    res.json({ success: true, ...result });
  })
);

router.put(
  '/:landId/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, description, imageUrl, websiteUrl } = req.body;
    const result = await landService.updateLandProfile(req.user.uid, req.params.landId, {
      name,
      description,
      imageUrl,
      websiteUrl,
    });
    res.json({ success: true, ...result });
  })
);

module.exports = router;
