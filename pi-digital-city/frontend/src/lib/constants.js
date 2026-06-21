export const LAND_LEVELS = {
  1: { name: 'Empty Plot', color: '#6b7280', emoji: '⬜' },
  2: { name: 'House', color: '#22c55e', emoji: '🏠' },
  3: { name: 'Shop', color: '#3b82f6', emoji: '🏪' },
  4: { name: 'Business Center', color: '#a855f7', emoji: '🏢' },
  5: { name: 'Mega Tower', color: '#f4af00', emoji: '🏙️' },
};

export const MAX_LEVEL = 5;

export function formatLad(n, decimals = 4) {
  return Number(n ?? 0).toFixed(decimals);
}
