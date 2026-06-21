const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) logger.error(err.message, err.details || '');
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details || undefined,
    });
  }

  logger.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: 'Route not found' });
}

module.exports = { errorHandler, notFoundHandler };
