const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Middleware para rutas protegidas
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) return res.status(401).json({ msg: 'Acceso denegado. No token proporcionado.' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ msg: 'Token inválido o expirado' });
  }

  // El rol se lee de la base en cada request: un usuario eliminado o degradado pierde acceso de inmediato.
  const user = await User.findById(payload.id).select('role').lean();
  if (!user) return res.status(401).json({ msg: 'Sesión inválida' });

  req.user = { id: String(user._id), role: user.role };
  next();
};

// Middleware específico para rol admin
const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ msg: 'Acceso restringido para administradores' });
  }
  next();
};

module.exports = { verifyToken, isAdmin };