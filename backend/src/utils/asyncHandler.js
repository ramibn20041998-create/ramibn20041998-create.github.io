/**
 * Wraps an async express route handler so rejected promises are forwarded
 * to the error-handling middleware instead of crashing the process.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
