// middlewares/auth.js
const jwt = require('jsonwebtoken');

function signAccessToken(payload) {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  const expiresIn = process.env.JWT_ACCESS_EXPIRES || '15m';
  return jwt.sign(payload, secret, { expiresIn });
}

function signRefreshToken(payload) {
  const secret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me';
  const expiresIn = process.env.JWT_REFRESH_EXPIRES || '30d';
  return jwt.sign(payload, secret, { expiresIn });
}

// Optional attach: Bearer varsa decode edip req.user ve x-user-id ekler.
// HATALI token görürse sessizce yok sayar (opsiyonel kullanım için).
async function attachUserIfTokenPresent(req, _res, next) {
  const h = req.headers['authorization'] || '';
  const m = /^bearer\s+(.+)$/i.exec(h);
  if (!m) return next();

  try {
    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const decoded = jwt.verify(m[1], secret);
    req.user = { id: decoded.id, roles: decoded.roles || ['user'] };
    // x-user-id yoksa enjekte et (mevcut controller’larla uyum için)
    if (!req.headers['x-user-id']) {
      req.headers['x-user-id'] = decoded.id;
    }
  } catch (_e) {
    // opsiyonel olduğundan sessiz geçiyoruz
  }
  next();
}

// Zorunlu auth: geçersiz/eksik token -> 401
function authRequired(req, res, next) {
  const h = req.headers['authorization'] || '';
  const m = /^bearer\s+(.+)$/i.exec(h);
  if (!m) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing Bearer token' } });

  try {
    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const decoded = jwt.verify(m[1], secret);
    req.user = { id: decoded.id, roles: decoded.roles || ['user'] };
    if (!req.headers['x-user-id']) req.headers['x-user-id'] = decoded.id;
    return next();
  } catch (e) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  attachUserIfTokenPresent,
  authRequired
};
