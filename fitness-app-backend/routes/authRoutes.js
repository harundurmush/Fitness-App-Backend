// routes/authRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { errors } = require('celebrate');
const { authRequired } = require('../middlewares/auth');
const {
  signup, login, refresh, me,
  signupValidator, loginValidator, refreshValidator
} = require('../controllers/authController');

const router = express.Router();

// brute-force koruması (auth uçları)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/signup', authLimiter, signupValidator, signup);
router.post('/login', authLimiter, loginValidator, login);
router.post('/refresh', refreshValidator, refresh);
router.get('/me', authRequired, me);

// celebrate error handler (route-local)
router.use(errors());

module.exports = router;
