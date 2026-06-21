const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/authMiddleware');
const { txCol } = require('../services/transactionService');

const router = express.Router();

router.get(
  '/me/transactions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const snap = await txCol.where('uid', '==', req.user.uid).orderBy('createdAt', 'desc').limit(limit).get();
    const transactions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ success: true, transactions });
  })
);

module.exports = router;
