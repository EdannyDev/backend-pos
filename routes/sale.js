const express = require('express');
const router = express.Router();
const Sale = require('../models/sale');
const Product = require('../models/product');
const { verifyToken, isAdmin } = require('../middlewares/auth');
const { validateCreateSale, validateUpdateSale, handleValidation } = require('../middlewares/validations');

// Función para comparar productos entre ventas (mismo producto y cantidad)
function areProductsEqual(productsA, productsB) {
  if (productsA.length !== productsB.length) return false;
  const sortedA = productsA.slice().sort((a,b) => a.productId.toString().localeCompare(b.productId.toString()));
  const sortedB = productsB.slice().sort((a,b) => a.productId.toString().localeCompare(b.productId.toString()));

  for (let i = 0; i < sortedA.length; i++) {
    if (
      sortedA[i].productId.toString() !== sortedB[i].productId.toString() ||
      sortedA[i].quantity !== sortedB[i].quantity
    ) {
      return false;
    }
  }
  return true;
}

// Crear una venta
router.post('/', validateCreateSale, handleValidation, verifyToken, async (req, res) => {
  try {
    const { products, paymentMethod } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ msg: 'Debes incluir al menos un producto' });
    }

    let total = 0;
    const processedProducts = [];

    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ msg: `Producto no encontrado: ${item.productId}` });

      if (item.quantity > product.stock) {
        return res.status(400).json({ msg: `Stock insuficiente para: ${product.name}` });
      }

      const subtotal = item.quantity * product.price;
      total += subtotal;

      processedProducts.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        subtotal
      });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentSales = await Sale.find({
      seller: req.user.id,
      total,
      createdAt: { $gte: fiveMinutesAgo }
    });

    for (const recentSale of recentSales) {
      if (areProductsEqual(recentSale.products, processedProducts)) {
        return res.status(400).json({ msg: 'Venta duplicada detectada. Intenta de nuevo más tarde.' });
      }
    }

    for (const item of processedProducts) {
      const product = await Product.findById(item.productId);
      product.stock -= item.quantity;
      await product.save();
    }

    const sale = new Sale({
      seller: req.user.id,
      products: processedProducts,
      total,
      paymentMethod
    });

    await sale.save();

    const lowStockAlerts = [];
    for (const item of processedProducts) {
      const product = await Product.findById(item.productId);
      if (product && product.stock <= 5) {
        lowStockAlerts.push({
          productId: product._id,
          name: product.name,
          stock: product.stock,
          msg: `El stock del producto "${product.name}" es bajo: ${product.stock} unidades restantes`
        });
      }
    }

    res.status(201).json({
      msg: 'Venta registrada exitosamente',
      sale,
      alerts: lowStockAlerts.length > 0 ? lowStockAlerts : undefined
    });

  } catch (err) {
    res.status(500).json({ msg: 'Error al registrar la venta', error: err.message });
  }
});

// Obtener todas las ventas
router.get('/', verifyToken, async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('seller', 'name email')
      .sort({ createdAt: -1 });

    const lowStockAlerts = [];

    for (const sale of sales) {
      for (const item of sale.products) {
        const product = await Product.findById(item.productId);
        if (product && product.stock <= 5) {
          lowStockAlerts.push({
            productId: product._id,
            name: product.name,
            stock: product.stock,
            msg: `El stock del producto "${product.name}" es bajo: ${product.stock} unidades restantes`
          });
        }
      }
    }
    res.json({
      sales,
      alerts: lowStockAlerts.length > 0 ? lowStockAlerts : undefined
    });
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener las ventas', error: err.message });
  }
});

// Obtener una venta por ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('seller', 'name email');

    if (!sale) return res.status(404).json({ msg: 'Venta no encontrada' });

    const lowStockAlerts = [];

    for (const item of sale.products) {
      const product = await Product.findById(item.productId);
      if (product && product.stock <= 5) {
        lowStockAlerts.push({
          productId: product._id,
          name: product.name,
          stock: product.stock,
          msg: `El stock del producto "${product.name}" es bajo: ${product.stock} unidades restantes`
        });
      }
    }
    res.json({
      sale,
      alerts: lowStockAlerts.length > 0 ? lowStockAlerts : undefined
    });
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener la venta', error: err.message });
  }
});

// Actualizar una venta (solo admin)
router.put('/:id', validateUpdateSale, handleValidation, verifyToken, isAdmin, async (req, res) => {
  try {
    const { products, paymentMethod, status } = req.body;

    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ msg: 'Venta no encontrada' });

    if (products && products.length > 0) {
      for (const item of sale.products) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }

      let total = 0;
      const processedProducts = [];

      for (const item of products) {
        const product = await Product.findById(item.productId);
        if (!product) return res.status(404).json({ msg: `Producto no encontrado: ${item.productId}` });

        if (item.quantity > product.stock) {
          return res.status(400).json({ msg: `Stock insuficiente para: ${product.name}` });
        }

        const subtotal = item.quantity * product.price;
        total += subtotal;

        processedProducts.push({
          productId: product._id,
          name: product.name,
          quantity: item.quantity,
          price: product.price,
          subtotal
        });

        product.stock -= item.quantity;
        await product.save();
      }

      sale.products = processedProducts;
      sale.total = total;
    }

    if (paymentMethod) sale.paymentMethod = paymentMethod;
    if (status) {
      if (!['completada', 'cancelada'].includes(status)) {
        return res.status(400).json({ msg: 'Estado inválido' });
      }
      sale.status = status;
    }

    await sale.save();
    res.json({ msg: 'Venta actualizada', sale });
  } catch (err) {
    res.status(500).json({ msg: 'Error al actualizar la venta', error: err.message });
  }
});

// Eliminar una venta (solo admin)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ msg: 'Venta no encontrada' });

    for (const item of sale.products) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }
    await Sale.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Venta eliminada y stock revertido' });
  } catch (err) {
    res.status(500).json({ msg: 'Error al cancelar la venta', error: err.message });
  }
});

module.exports = router;