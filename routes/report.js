const express = require('express');
const router = express.Router();
const Sale = require('../models/sale');
const { verifyToken, isAdmin } = require('../middlewares/auth');

// Ventas diarias (Últimos 30 días)
router.get('/daily-sales', verifyToken, isAdmin, async (req, res) => {
  try {
    const dailySales = await Sale.aggregate([
      {
        $match: { status: 'completada', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(dailySales);
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener ventas diarias' });
  }
});

// Ventas mensuales (Últimos 12 meses)
router.get('/monthly-sales', verifyToken, isAdmin, async (req, res) => {
  try {
    const monthlySales = await Sale.aggregate([
      {
        $match: { status: 'completada', createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(monthlySales);
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener ventas mensuales' });
  }
});

// Ventas por usuario
router.get('/user-sales', verifyToken, isAdmin, async (req, res) => {
  try {
    const userSales = await Sale.aggregate([
      { $match: { status: 'completada' } },
      {
        $group: {
          _id: "$seller",
          total: { $sum: "$total" },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          name: { $ifNull: ["$user.name", "Usuario eliminado"] },
          email: { $ifNull: ["$user.email", "—"] },
          total: 1,
          count: 1
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json(userSales);
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener ventas por usuario' });
  }
});

// Productos más vendidos
router.get('/top-products', verifyToken, isAdmin, async (req, res) => {
  try {
    const topProducts = await Sale.aggregate([
      { $match: { status: 'completada' } },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          name: { $last: "$products.name" },
          quantitySold: { $sum: "$products.quantity" },
          total: { $sum: "$products.subtotal" }
        }
      },
      {
        $project: {
          _id: 0,
          name: 1,
          quantitySold: 1,
          total: 1
        }
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 10 }
    ]);

    res.json(topProducts);
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener productos más vendidos' });
  }
});

// Ingresos totales
router.get('/total-income', verifyToken, isAdmin, async (req, res) => {
  try {
    const income = await Sale.aggregate([
      { $match: { status: 'completada' } },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" }
        }
      }
    ]);

    res.json({ total: income[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener ingresos totales' });
  }
});

module.exports = router;