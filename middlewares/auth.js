const jwt = require('jsonwebtoken');

// Middleware para rutas protegidas
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) return res.status(401).json({ msg: 'Acceso denegado. No token proporcionado.' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token inválido o expirado' });
  }
};

// Middleware específico para rol admin
const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ msg: 'Acceso restringido para administradores' });
  }
  next();
};

module.exports = { verifyToken, isAdmin };