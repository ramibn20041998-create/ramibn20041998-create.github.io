const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const settingsService = require('../services/settingsService');
const { CITY_GRID_WIDTH, CITY_GRID_HEIGHT, TOTAL_LAND_SUPPLY, LAND_LEVELS, MAX_LEVEL } = require('../config/constants');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const settings = await settingsService.getSettings();
    res.json({
      success: true,
      settings,
      city: { gridWidth: CITY_GRID_WIDTH, gridHeight: CITY_GRID_HEIGHT, totalSupply: TOTAL_LAND_SUPPLY },
      levels: LAND_LEVELS,
      maxLevel: MAX_LEVEL,
    });
  })
);

module.exports = router;
