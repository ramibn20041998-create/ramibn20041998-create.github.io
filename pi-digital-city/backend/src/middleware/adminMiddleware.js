const ApiError = require('../utils/ApiError');

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    throw new ApiError(403, 'Admin access required');
  }
  next();
}

module.exports = { requireAdmin };
