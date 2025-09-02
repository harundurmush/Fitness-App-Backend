// middlewares/errorHandler.js

const { isCelebrateError } = require('celebrate');

// Tek tip hata yanıti:
// { error: { code, message, details? } }
function buildErrorBody(code, message, details) {
  const body = { error: { code, message } };
  if (details && Array.isArray(details) && details.length) {
    body.error.details = details;
  }
  return body;
}

module.exports = function errorHandler(err, req, res, _next) {
  // Celebrate/Joi validasyon hatası
  if (isCelebrateError && isCelebrateError(err)) {
    const details = [];
    for (const [segment, joiError] of err.details.entries()) {
      details.push({
        segment, // body | query | params | headers
        issues: joiError.details.map(d => ({
          message: d.message,
          path: d.path.join('.')
        }))
      });
    }
    return res.status(400).json(buildErrorBody('VALIDATION_ERROR', 'Request validation failed', details));
  }

  // Özel atılan hatalarda (ör. throw { status: 403, code: 'FORBIDDEN', message: '...' })
  if (err && (err.status || err.statusCode)) {
    const status = err.status || err.statusCode || 500;
    const code = err.code || 'ERROR';
    const message = err.message || 'Unexpected error';
    return res.status(status).json(buildErrorBody(code, message, err.details));
  }

  // Mongo duplicate key (ör. favorites unique index)
  if (err && err.code === 11000) {
    return res.status(409).json(buildErrorBody('DUPLICATE', 'Resource already exists'));
  }

  // JWT gibi bilinen hatalar (opsiyonel)
  if (err && err.name === 'JsonWebTokenError') {
    return res.status(401).json(buildErrorBody('INVALID_TOKEN', 'Invalid token'));
  }
  if (err && err.name === 'TokenExpiredError') {
    return res.status(401).json(buildErrorBody('TOKEN_EXPIRED', 'Token has expired'));
  }

  // Geri kalan her şey
  console.error('Unhandled error:', err);
  return res.status(500).json(buildErrorBody('INTERNAL_ERROR', 'Internal server error'));
};
