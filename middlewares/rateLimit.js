const rateLimit = require('express-rate-limit');

// Limita intentos sobre rutas de autenticación (fuerza bruta / abuso del envío de correos)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { msg: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});

module.exports = { authLimiter };