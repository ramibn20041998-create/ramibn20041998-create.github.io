const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { requireAuth } = require('../middleware/authMiddleware');
const piPlatform = require('../services/piPlatformService');
const paymentService = require('../services/paymentService');

const router = express.Router();

/**
 * Step 1 of the Pi payment flow.
 * Fired from the frontend's `onReadyForServerApproval(paymentId)` callback.
 * We must approve BEFORE the user is shown the confirm screen in their wallet.
 */
router.post(
  '/approve',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { paymentId } = req.body;
    if (!paymentId) throw new ApiError(400, 'paymentId is required');

    const piPayment = await piPlatform.getPayment(paymentId);
    if (piPayment.user_uid !== req.user.uid) {
      throw new ApiError(403, 'This payment does not belong to the authenticated user');
    }

    await paymentService.recordPendingPayment(req.user.uid, paymentId, piPayment);
    await piPlatform.approvePayment(paymentId);
    await paymentService.markApproved(paymentId);

    res.json({ success: true });
  })
);

/**
 * Step 2 of the Pi payment flow.
 * Fired from `onReadyForServerCompletion(paymentId, txid)` once the user has
 * confirmed the transaction in their Pi wallet and it has a blockchain txid.
 * LAD is only credited here, after we re-verify everything server-side.
 */
router.post(
  '/complete',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { paymentId, txid } = req.body;
    if (!paymentId || !txid) throw new ApiError(400, 'paymentId and txid are required');

    const piPayment = await piPlatform.getPayment(paymentId);
    if (piPayment.user_uid !== req.user.uid) {
      throw new ApiError(403, 'This payment does not belong to the authenticated user');
    }

    await piPlatform.completePayment(paymentId, txid);
    const result = await paymentService.completePiPurchase(paymentId, txid, piPayment);

    res.json({ success: true, ladCredited: result.ladAmount, alreadyCompleted: result.alreadyCompleted });
  })
);

/** Lets the frontend clean up a payment it decided not to pursue (e.g. user backed out). */
router.post(
  '/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { paymentId, reason } = req.body;
    if (!paymentId) throw new ApiError(400, 'paymentId is required');

    await piPlatform.cancelPayment(paymentId);
    await paymentService.markFailed(paymentId, reason || 'cancelled_by_user');

    res.json({ success: true });
  })
);

/**
 * Handles a payment the Pi SDK found still pending from a previous session
 * (`onIncompletePaymentFound`). We just try to complete it using whatever
 * the Pi Platform currently reports - completePiPurchase is idempotent.
 */
router.post(
  '/resolve-incomplete',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { paymentId } = req.body;
    if (!paymentId) throw new ApiError(400, 'paymentId is required');

    const piPayment = await piPlatform.getPayment(paymentId);
    if (piPayment.user_uid !== req.user.uid) {
      throw new ApiError(403, 'This payment does not belong to the authenticated user');
    }

    if (piPayment.status?.transaction_verified && piPayment.transaction?.txid) {
      await paymentService.recordPendingPayment(req.user.uid, paymentId, piPayment);
      const result = await paymentService.completePiPurchase(paymentId, piPayment.transaction.txid, piPayment);
      return res.json({ success: true, resolved: true, ladCredited: result.ladAmount });
    }

    res.json({ success: true, resolved: false });
  })
);

module.exports = router;
