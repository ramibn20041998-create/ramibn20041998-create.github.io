const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const landRoutes = require('./routes/landRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const decorationRoutes = require('./routes/decorationRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const adminRoutes = require('./routes/adminRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.set('trust proxy', 1); // Render sits behind a proxy - needed for correct rate-limit IPs

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',') : '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

// Generous global limiter; financial write endpoints get tighter limits below
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down' },
});

app.get('/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/payments', writeLimiter, paymentRoutes);
app.use('/api/lands', landRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/rewards', writeLimiter, rewardRoutes);
app.use('/api/decorations', decorationRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
