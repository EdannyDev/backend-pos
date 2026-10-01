const { body, header, validationResult } = require('express-validator');

const validateRegister = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password')
    .isLength({ min: 8 }).withMessage('Debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('Debe incluir una mayúscula')
    .matches(/[a-z]/).withMessage('Debe incluir una minúscula')
    .matches(/\d/).withMessage('Debe incluir un número')
    .matches(/[\W_]/).withMessage('Debe incluir un símbolo'),
];

const validateLogin = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
];

const validateUserUpdate = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('role').optional().isIn(['admin', 'seller']).withMessage('Rol inválido'),
];

const validateUpdateProfile = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('password')
    .optional()
    .isLength({ min: 8 }).withMessage('Debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('Debe incluir una mayúscula')
    .matches(/[a-z]/).withMessage('Debe incluir una minúscula')
    .matches(/\d/).withMessage('Debe incluir un número')
    .matches(/[\W_]/).withMessage('Debe incluir un símbolo'),
];

const validateCreateProduct = [
  body('name').notEmpty().withMessage('El nombre del producto es obligatorio'),
  body('category').notEmpty().withMessage('La categoría es obligatoria'),
  body('price').isFloat({ min: 0 }).withMessage('Precio inválido'),
  body('stock').isInt({ min: 0 }).withMessage('Stock inválido'),
  body('description').optional().trim(),
  body('imageUrl').optional().isURL().withMessage('URL de imagen inválida'),
];

const validateUpdateProduct = [
  body('name').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('category').optional().notEmpty().withMessage('La categoría no puede estar vacía'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Precio inválido'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock inválido'),
  body('description').optional().trim(),
  body('imageUrl').optional().isURL().withMessage('URL de imagen inválida'),
];

const validateForgotPassword = [
  body('email').isString().bail().isEmail().withMessage('Email inválido'),
];

const validateResetPassword = [
  body('token').isString().bail().isLength({ min: 64, max: 64 }).withMessage('Token inválido'),
  body('password').isString().bail()
    .isLength({ min: 8, max: 72 }).withMessage('Debe tener entre 8 y 72 caracteres')
    .matches(/[A-Z]/).withMessage('Debe incluir una mayúscula')
    .matches(/[a-z]/).withMessage('Debe incluir una minúscula')
    .matches(/\d/).withMessage('Debe incluir un número')
    .matches(/[\W_]/).withMessage('Debe incluir un símbolo'),
];

const validateCreateSale = [
  header('idempotency-key').optional().isUUID().withMessage('Idempotency-Key inválida'),
  body('products').isArray({ min: 1, max: 50 }).withMessage('Debes incluir entre 1 y 50 productos'),
  body('products.*.productId').isMongoId().withMessage('ID de producto inválido'),
  body('products.*.quantity').isInt({ min: 1, max: 10000 }).withMessage('Cantidad inválida').toInt(),
  body('paymentMethod')
    .isIn(['efectivo', 'tarjeta', 'transferencia'])
    .withMessage('Método de pago inválido'),
];

const validateUpdateSale = [
  body('products').optional().isArray({ min: 1 }).withMessage('Debes incluir al menos un producto'),
  body('products.*.productId').isMongoId().withMessage('ID de producto inválido'),
  body('products.*.quantity').isInt({ min: 1, max: 10000 }).withMessage('Cantidad inválida').toInt(),
  body('paymentMethod').optional()
    .isIn(['efectivo', 'tarjeta', 'transferencia'])
    .withMessage('Método de pago inválido'),
  body('status').optional()
    .isIn(['completada', 'cancelada'])
    .withMessage('Estado inválido'),
];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: 'Error de validación', errors: errors.array() });
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateUserUpdate,
  validateUpdateProfile,
  validateForgotPassword,
  validateResetPassword,
  validateCreateProduct,
  validateUpdateProduct,
  validateCreateSale,
  validateUpdateSale,
  handleValidation,
};