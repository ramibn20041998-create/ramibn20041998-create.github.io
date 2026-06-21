const axios = require('axios');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const PI_API_BASE = process.env.PI_API_BASE || 'https://api.minepi.com/v2';

const piApi = axios.create({
  baseURL: PI_API_BASE,
  timeout: 15000,
  headers: {
    Authorization: `Key ${process.env.PI_API_KEY}`,
  },
});

/**
 * Verifies a Pi access token obtained client-side via Pi.authenticate(),
 * by asking the Pi Platform who it belongs to. Never trust a token's
 * payload without this server-side round trip.
 */
async function verifyAccessToken(accessToken) {
  try {
    const { data } = await axios.get(`${PI_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 15000,
    });
    // data: { uid, username, credentials: { scopes, ... } }
    return data;
  } catch (err) {
    logger.warn('Pi /me verification failed', err?.response?.data || err.message);
    throw new ApiError(401, 'Could not verify Pi account');
  }
}

/** Fetches a payment's current state directly from the Pi Platform (source of truth). */
async function getPayment(paymentId) {
  try {
    const { data } = await piApi.get(`/payments/${paymentId}`);
    return data;
  } catch (err) {
    logger.warn('Pi getPayment failed', err?.response?.data || err.message);
    throw new ApiError(502, 'Could not fetch payment from Pi Network');
  }
}

/** Server-side approval, required before the user can be prompted to confirm in the Pi wallet. */
async function approvePayment(paymentId) {
  try {
    const { data } = await piApi.post(`/payments/${paymentId}/approve`);
    return data;
  } catch (err) {
    logger.warn('Pi approvePayment failed', err?.response?.data || err.message);
    throw new ApiError(502, 'Pi Network rejected the payment approval');
  }
}

/** Server-side completion, called once the blockchain transaction id (txid) is known. */
async function completePayment(paymentId, txid) {
  try {
    const { data } = await piApi.post(`/payments/${paymentId}/complete`, { txid });
    return data;
  } catch (err) {
    logger.warn('Pi completePayment failed', err?.response?.data || err.message);
    throw new ApiError(502, 'Pi Network rejected the payment completion');
  }
}

/** Cancels a payment server-side, e.g. if our own validation fails after approval. */
async function cancelPayment(paymentId) {
  try {
    const { data } = await piApi.post(`/payments/${paymentId}/cancel`);
    return data;
  } catch (err) {
    logger.warn('Pi cancelPayment failed', err?.response?.data || err.message);
    // Don't throw - cancellation is best-effort cleanup
    return null;
  }
}

module.exports = {
  verifyAccessToken,
  getPayment,
  approvePayment,
  completePayment,
  cancelPayment,
};
