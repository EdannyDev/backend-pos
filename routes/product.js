const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const { verifyToken, isAdmin } = require('../middlewares/auth');
const { validateCreateProduct, validateUpdateProduct, handleValidation } = require('../middlewares/validations');

// Crear producto (solo admin)
router.post('/', validateCreateProduct, handleValidation, verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, description, category, price, stock, imageUrl } = req.body;

    const existingProduct = await Product.findOne({ name: name.trim() });
    if (existingProduct) {
      return res.status(400).json({ msg: 'Ya existe un producto con ese nombre' });
    }

    const product = new Product({ name, description, category, price, stock, imageUrl });
    await product.save();
    res.status(201).json({ msg: 'Producto creado', product });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Ya existe un producto con ese nombre (único)' });
    }
    res.status(500).json({ msg: 'Error al crear producto', error: err.message });
  }
});

// Obtener todos los productos
router.get('/', verifyToken, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener productos', error: err.message });
  }
});

// Obtener producto por ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Producto no encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener producto', error: err.message });
  }
});

// Actualizar producto (solo admin)
router.put('/:id', validateUpdateProduct, handleValidation, verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, description, category, price, stock, imageUrl } = req.body;

    const existingProduct = await Product.findOne({ name: name.trim(), _id: { $ne: req.params.id } });
    if (existingProduct) {
      return res.status(400).json({ msg: 'Ya existe otro producto con ese nombre' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, description, category, price, stock, imageUrl },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ msg: 'Producto no encontrado' });
    res.json({ msg: 'Producto actualizado', product });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Ya existe un producto con ese nombre (único)' });
    }
    res.status(500).json({ msg: 'Error al actualizar producto', error: err.message });
  }
});

// Eliminar producto (solo admin)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Producto no encontrado' });
    res.json({ msg: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ msg: 'Error al eliminar producto', error: err.message });
  }
});

module.exports = router;