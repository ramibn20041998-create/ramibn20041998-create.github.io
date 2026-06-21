/**
 * Pi Digital City - Core Economy Constants
 *
 * HARD CAPS (never change, never exposed to admin panel):
 * These define the permanent, fixed nature of the city's land supply.
 */
const CITY_GRID_WIDTH = 1000;
const CITY_GRID_HEIGHT = 1000;
const TOTAL_LAND_SUPPLY = CITY_GRID_WIDTH * CITY_GRID_HEIGHT; // 1,000,000 - fixed forever

/**
 * TUNABLE DEFAULTS
 * These seed the `settings/global` Firestore document on first boot.
 * After that, the live values in Firestore are the source of truth and
 * can be adjusted by an admin via /api/admin/settings. This file is only
 * the fallback used if Firestore has not been seeded yet.
 */
const DEFAULT_SETTINGS = {
  // 1 Pi = 0.1 LAD  <=>  1 LAD = 10 Pi
  piToLadRate: 0.1,

  landPriceLad: 0.5, // = 5 Pi

  upgradeCosts: {
    2: 0.1,  // Level 1 -> 2 (House)
    3: 0.25, // Level 2 -> 3 (Shop)
    4: 0.5,  // Level 3 -> 4 (Business Center)
    5: 1.0,  // Level 4 -> 5 (Mega Tower)
  },

  dailyRewardRates: {
    1: 0,
    2: 0.001,
    3: 0.003,
    4: 0.008,
    5: 0.02,
  },

  burnPercent: 0.30,        // 30% of every upgrade cost is burned
  marketplaceFeePercent: 0.10, // 10% platform fee on land resales

  minListingPriceLad: 0.01,
  maxListingPriceLad: 100000,

  maintenanceMode: false,
};

const LAND_LEVELS = {
  1: { name: 'Empty Plot', color: '#6b7280' },        // Gray
  2: { name: 'House', color: '#22c55e' },              // Green
  3: { name: 'Shop', color: '#3b82f6' },                // Blue
  4: { name: 'Business Center', color: '#a855f7' },     // Purple
  5: { name: 'Mega Tower', color: '#f4af00' },          // Gold
};

const MAX_LEVEL = 5;

const TX_TYPES = {
  PI_PURCHASE: 'pi_purchase',          // Pi -> LAD top-up
  LAND_BUY_PRIMARY: 'land_buy_primary', // buying unowned land from the city (mint)
  LAND_BUY_MARKET: 'land_buy_market',   // buying a listed land from another user
  LAND_SELL: 'land_sell',
  LAND_LIST: 'land_list',
  LAND_UNLIST: 'land_unlist',
  UPGRADE: 'upgrade',
  CLAIM_REWARD: 'claim_reward',
  DECORATION_PURCHASE: 'decoration_purchase',
  ADMIN_ADJUSTMENT: 'admin_adjustment',
};

module.exports = {
  CITY_GRID_WIDTH,
  CITY_GRID_HEIGHT,
  TOTAL_LAND_SUPPLY,
  DEFAULT_SETTINGS,
  LAND_LEVELS,
  MAX_LEVEL,
  TX_TYPES,
};
