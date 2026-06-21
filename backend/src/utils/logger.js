/* Minimal structured logger - swap for pino/winston in a larger deployment */
const ts = () => new Date().toISOString();

module.exports = {
  info: (...args) => console.log(`[INFO ${ts()}]`, ...args),
  warn: (...args) => console.warn(`[WARN ${ts()}]`, ...args),
  error: (...args) => console.error(`[ERROR ${ts()}]`, ...args),
};
