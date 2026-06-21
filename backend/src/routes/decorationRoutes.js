const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { requireAuth } = require('../middleware/authMiddleware');
const decorationService = require('../services/decorationService');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const catalog = await decorationService.getCatalog();
    res.json({ success: true, catalog });
  })
);

router.post(
  '/buy',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { landId, decorationId } = req.body;
    if (!landId || !decorationId) throw new ApiError(400, 'landId and decorationId are required');
    const result = await decorationService.purchaseDecoration(req.user.uid, landId, decorationId);
    res.json({ success: true, ...result });
  })
);

module.exports = router;
