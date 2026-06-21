const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export function getToken() {
  return localStorage.getItem('pdc_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('pdc_token', token);
  else localStorage.removeItem('pdc_token');
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (!token) throw new Error('You must be signed in to do that');
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  // Auth
  login: (accessToken) => request('/auth/login', { method: 'POST', body: { accessToken } }),
  me: () => request('/auth/me', { auth: true }),

  // Settings
  settings: () => request('/settings'),

  // Lands
  getLand: (landId) => request(`/lands/${landId}`),
  getLandsInRegion: (xMin, xMax, yMin, yMax) =>
    request(`/lands?xMin=${xMin}&xMax=${xMax}&yMin=${yMin}&yMax=${yMax}`),
  myLands: () => request('/lands/mine', { auth: true }),
  buyLand: (x, y) => request('/lands/buy', { method: 'POST', auth: true, body: { x, y } }),
  upgradeLand: (landId) => request(`/lands/${landId}/upgrade`, { method: 'POST', auth: true }),
  updateLandProfile: (landId, profile) =>
    request(`/lands/${landId}/profile`, { method: 'PUT', auth: true, body: profile }),

  // Marketplace
  searchListings: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/marketplace${q ? `?${q}` : ''}`);
  },
  listLand: (landId, priceLad) => request('/marketplace/list', { method: 'POST', auth: true, body: { landId, priceLad } }),
  unlistLand: (landId) => request('/marketplace/unlist', { method: 'POST', auth: true, body: { landId } }),
  buyListedLand: (landId) => request('/marketplace/buy', { method: 'POST', auth: true, body: { landId } }),

  // Rewards
  claimReward: (landId) => request(`/rewards/claim/${landId}`, { method: 'POST', auth: true }),
  claimAllRewards: () => request('/rewards/claim-all', { method: 'POST', auth: true }),

  // Decorations
  decorationCatalog: () => request('/decorations'),
  buyDecoration: (landId, decorationId) =>
    request('/decorations/buy', { method: 'POST', auth: true, body: { landId, decorationId } }),

  // Leaderboard
  leaderboardRichest: () => request('/leaderboard/richest'),
  leaderboardLargestOwners: () => request('/leaderboard/largest-owners'),
  leaderboardHighestLevel: () => request('/leaderboard/highest-level'),
  leaderboardMostValuable: () => request('/leaderboard/most-valuable'),

  // Payments
  approvePayment: (paymentId) => request('/payments/approve', { method: 'POST', auth: true, body: { paymentId } }),
  completePayment: (paymentId, txid) =>
    request('/payments/complete', { method: 'POST', auth: true, body: { paymentId, txid } }),
  cancelPayment: (paymentId, reason) =>
    request('/payments/cancel', { method: 'POST', auth: true, body: { paymentId, reason } }),
  resolveIncomplete: (paymentId) =>
    request('/payments/resolve-incomplete', { method: 'POST', auth: true, body: { paymentId } }),

  // User
  myTransactions: (limit = 50) => request(`/users/me/transactions?limit=${limit}`, { auth: true }),

  // Admin
  adminOverview: () => request('/admin/overview', { auth: true }),
  adminGetSettings: () => request('/admin/settings', { auth: true }),
  adminUpdateSettings: (partial) => request('/admin/settings', { method: 'PUT', auth: true, body: partial }),
  adminBanUser: (uid) => request(`/admin/users/${uid}/ban`, { method: 'POST', auth: true }),
  adminUnbanUser: (uid) => request(`/admin/users/${uid}/unban`, { method: 'POST', auth: true }),
  adminRemoveListing: (listingId, reason) =>
    request(`/admin/listings/${listingId}`, { method: 'DELETE', auth: true, body: { reason } }),
};
