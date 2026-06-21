const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');
const settingsService = require('../services/settingsService');
const adminService = require('../services/adminService');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get(
  '/settings',
  asyncHandler(async (req, res) => {
    res.json({ success: true, settings: await settingsService.getSettings({ skipCache: true }) });
  })
);

router.put(
  '/settings',
  asyncHandler(async (req, res) => {
    const settings = await settingsService.updateSettings(req.body);
    res.json({ success: true, settings });
  })
);

router.post(
  '/users/:uid/ban',
  asyncHandler(async (req, res) => {
    const result = await adminService.setUserBanned(req.params.uid, true);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/users/:uid/unban',
  asyncHandler(async (req, res) => {
    const result = await adminService.setUserBanned(req.params.uid, false);
    res.json({ success: true, ...result });
  })
);

router.delete(
  '/listings/:listingId',
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const result = await adminService.removeListing(req.params.listingId, reason);
    res.json({ success: true, ...result });
  })
);

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    res.json({ success: true, overview: await adminService.getAdminOverview() });
  })
);

module.exports = router;
