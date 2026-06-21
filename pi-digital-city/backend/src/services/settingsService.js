const { db, FieldValue } = require('../config/firebaseAdmin');
const { DEFAULT_SETTINGS } = require('../config/constants');

const SETTINGS_DOC = db.collection('settings').doc('global');

let cache = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 10_000; // short cache - admin changes should propagate quickly

/** Returns the live global settings, seeding Firestore with defaults if missing. */
async function getSettings({ skipCache = false } = {}) {
  const now = Date.now();
  if (!skipCache && cache && now < cacheExpiresAt) return cache;

  const snap = await SETTINGS_DOC.get();
  if (!snap.exists) {
    await SETTINGS_DOC.set({
      ...DEFAULT_SETTINGS,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    cache = { ...DEFAULT_SETTINGS };
  } else {
    cache = { ...DEFAULT_SETTINGS, ...snap.data() };
  }
  cacheExpiresAt = now + CACHE_TTL_MS;
  return cache;
}

/** Merges a partial update into settings (admin only - enforced at the route level). */
async function updateSettings(partial) {
  const allowedKeys = new Set(Object.keys(DEFAULT_SETTINGS));
  const sanitized = {};
  for (const [key, value] of Object.entries(partial)) {
    if (allowedKeys.has(key)) sanitized[key] = value;
  }
  sanitized.updatedAt = FieldValue.serverTimestamp();
  await SETTINGS_DOC.set(sanitized, { merge: true });
  cache = null; // bust cache
  return getSettings({ skipCache: true });
}

module.exports = { getSettings, updateSettings };
