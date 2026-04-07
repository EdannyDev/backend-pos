const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { sendResetEmail } = require('../utils/resendMailer');
const { verifyToken, isAdmin } = require('../middlewares/auth');
const { 
  validateRegister, 
  validateLogin, 
  validateUserUpdate, 
  validateUpdateProfile, 
  handleValidation 
} = require('../middlewares/validations');

// Registro
router.post('/register', validateRegister, handleValidation, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: 'El usuario ya existe' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ msg: 'Usuario registrado correctamente', role: newUser.role });
  } catch (err) {
    res.status(500).json({ msg: 'Error en el servidor', error: err.message });
  }
});

// Inicio de sesión
router.post('/login', validateLogin, handleValidation, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Credenciales inválidas' });

    let isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ role: user.role, name: user.name });
  } catch (err) {
    res.status(500).json({ msg: 'Error en el servidor', error: err.message });
  }
});

// Modo Demo
router.post('/demo-login', async (req, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'seller'].includes(role)) {
      return res.status(400).json({ msg: 'Rol demo inválido' });
    }

    const demoData = {
      admin: {
        email: 'demo_admin@pos.io',
        password: 'Admin123$',
        name: 'Admin Demo',
      },
      seller: {
        email: 'demo_seller@pos.io',
        password: 'Seller123$',
        name: 'Seller Demo',
      },
    };

    const { email, password, name } = demoData[role];
    let user = await User.findOne({ email });

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, demo: true },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 2 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ role: user.role, name: user.name, demo: true });
  } catch (err) {
    res.status(500).json({ msg: 'Error en demo login', error: err.message });
  }
});

// Cerrar sesión
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    path: '/',
  });
  res.json({ msg: 'Sesión cerrada correctamente' });
});

// Contraseña olvidada
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        msg: 'Si el correo existe, se enviaron instrucciones'
      });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');

    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.passwordToken = hashedToken;
    user.passwordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/resetPassword?token=${resetToken}`;
      await sendResetEmail({
      to: user.email,
      name: user.name,
      resetUrl
    });

    res.json({
      msg: 'Si el correo existe, se enviaron instrucciones'
    });

  } catch (err) {
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});

// Restablecer contraseña
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordToken: hashedToken,
      passwordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: 'Token inválido o expirado' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.passwordToken = null;
    user.passwordExpires = null;
    await user.save();

    res.json({ msg: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});

// Obtener todos los usuarios (solo admin y excepto a sí mismo)
router.get('/list', verifyToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('-password -passwordToken -passwordExpires');
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener usuarios', error: err.message });
  }
});

// Obtener un usuario por ID (solo admin y excepto a sí mismo)
router.get('/list/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(403).json({ msg: 'No puedes acceder a tu propia cuenta desde esta ruta' });
    }

    const user = await User.findById(req.params.id).select('-password -passwordToken -passwordExpires');
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener usuario', error: err.message });
  }
});

// Actualizar datos de un usuario (solo admin excepto contraseña y a sí mismo)
router.put('/update/:id', validateUserUpdate, handleValidation, verifyToken, isAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(403).json({ msg: 'No puedes actualizar tu propia cuenta desde esta ruta' });
    }

    if ('password' in req.body || 'passwordToken' in req.body || 'passwordExpires' in req.body) {
      return res.status(400).json({ msg: 'No está permitido modificar la contraseña desde esta ruta' });
    }

    const { name, email, role } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;

    await user.save();

    res.json({ msg: 'Usuario actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ msg: 'Error al actualizar usuario', error: err.message });
  }
});

// Eliminar un usuario (solo admin y excepto a sí mismo)
router.delete('/delete/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(403).json({ msg: 'No puedes eliminar tu propia cuenta desde esta ruta' });
    }

    const result = await User.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ msg: 'Usuario no encontrado' });

    res.json({ msg: 'Usuario eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ msg: 'Error al eliminar usuario', error: err.message });
  }
});

// Obtener perfil del usuario autenticado (sin parámetro)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -passwordToken -passwordExpires');
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener perfil', error: err.message });
  }
});

// Obtener perfil
router.get('/profile/:id', verifyToken, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ msg: 'No puedes acceder al perfil de otro usuario' });
    }

    const user = await User.findById(req.user.id).select('-password -passwordToken -passwordExpires');
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener perfil', error: err.message });
  }
});

// Actualizar perfil
router.put('/profile/:id', validateUpdateProfile, handleValidation, verifyToken, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ msg: 'No puedes actualizar datos de otro usuario' });
    }
    
    const { name, email, password } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

    if (name) user.name = name;
    if (email) user.email = email;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }
    await user.save();
    res.json({ msg: 'Perfil actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ msg: 'Error al actualizar perfil', error: err.message });
  }
});

// Eliminar cuenta
router.delete('/profile/:id', verifyToken, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ msg: 'No puedes eliminar la cuenta de otro usuario' });
    }

    await User.findByIdAndDelete(req.user.id);
    res.json({ msg: 'Cuenta eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ msg: 'Error al eliminar cuenta', error: err.message });
  }
});

module.exports = router;