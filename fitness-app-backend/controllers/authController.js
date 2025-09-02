// controllers/authController.js
const { celebrate, Joi, Segments } = require('celebrate');
const User = require('../models/userModel');
const { signAccessToken, signRefreshToken } = require('../middlewares/auth');

// ======= Validators =======
const signupValidator = celebrate({
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(80).required(),
    password: Joi.string().min(6).max(128).required()
  })
});

const loginValidator = celebrate({
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required()
  })
});

const refreshValidator = celebrate({
  [Segments.BODY]: Joi.object({
    refreshToken: Joi.string().required()
  })
});

// ======= Controllers =======
exports.signupValidator = signupValidator;
exports.loginValidator = loginValidator;
exports.refreshValidator = refreshValidator;

exports.signup = async (req, res) => {
  try {
    const { email, name, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'Email already registered' } });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ email, name, passwordHash });

    const accessToken = signAccessToken({ id: user._id, roles: user.roles });
    const refreshToken = signRefreshToken({ id: user._id });

    return res.status(201).json({
      user: user.toSafeJSON(),
      tokens: {
        tokenType: 'Bearer',
        accessToken,
        refreshToken,
        expiresIn: 60 * 15 // 15m (varsayılan)
      }
    });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } });
    }

    const accessToken = signAccessToken({ id: user._id, roles: user.roles });
    const refreshToken = signRefreshToken({ id: user._id });

    return res.status(200).json({
      user: user.toSafeJSON(),
      tokens: {
        tokenType: 'Bearer',
        accessToken,
        refreshToken,
        expiresIn: 60 * 15
      }
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  }
};

exports.refresh = async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const { refreshToken } = req.body;

    const secret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me';
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, secret);
    } catch (_e) {
      return res.status(401).json({ error: { code: 'INVALID_REFRESH', message: 'Invalid or expired refresh token' } });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: { code: 'INVALID_REFRESH', message: 'User no longer exists' } });

    const accessToken = signAccessToken({ id: user._id, roles: user.roles });
    const newRefresh = signRefreshToken({ id: user._id }); // basit MVP, rota-tabanlı değil

    return res.status(200).json({
      tokens: {
        tokenType: 'Bearer',
        accessToken,
        refreshToken: newRefresh,
        expiresIn: 60 * 15
      }
    });
  } catch (err) {
    console.error('refresh error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  }
};

exports.me = async (req, res) => {
  try {
    // authRequired middleware set eder
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing user' } });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    return res.status(200).json({ user: user.toSafeJSON() });
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  }
};
