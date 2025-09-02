// server.js
require('dotenv').config(); // load .env

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db'); // centralized DB connector

const planRoutes = require('./routes/planRoutes');
const logRoutes = require('./routes/logRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const authRoutes = require('./routes/authRoutes');

const { errors: celebrateErrors } = require('celebrate');
const errorHandler = require('./middlewares/errorHandler');

// Swagger
const { swaggerUi, swaggerSpec } = require('./docs/swagger');

const app = express();

// --- Security & basics
app.use(helmet());
app.use(cors()); // prod'da origin whitelist ayarla
app.use(bodyParser.json());

// --- Rate limiters
// Genel API limiti
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dk
  max: 1000, // 15 dk'da 1000 isteğe izin
  standardHeaders: true,
  legacyHeaders: false
});
// Giriş/refresh gibi uçları daha sıkı tut
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 dk
  max: 30, // 10 dk'da 30 deneme
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later.' } }
});

app.use('/api', apiLimiter);

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authLimiter, authRoutes); // auth uçlarına sıkı limit
app.use('/api/plan', planRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/favorites', favoriteRoutes);

// Celebrate validation errors -> JSON
app.use(celebrateErrors());

// Global error handler (en sonda!)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})();
