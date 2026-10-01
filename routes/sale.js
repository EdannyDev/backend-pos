const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Sale = require('../models/sale');
const Product = require('../models/product');
const { verifyToken, isAdmin } = require('../middlewares/auth');
const { validateCreateSale, validateUpdateSale, handleValidation } = require('../middlewares/validations');

const LOW_STOCK = 5;
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Un seller solo ve sus ventas; el admin ve todas.
const scope = (req) => (req.user.role === 'admin' ? {} : { seller: req.user.id });

const validId = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id) ? next() : res.status(404).json({ msg: 'Venta no encontrada' });

// Une líneas repetidas del mismo producto: Map(productId -> cantidad)
function mergeItems(items) {
  const map = new Map();
  for (const { productId, quantity } of items) {
    const id = new mongoose.Types.ObjectId(productId).toString();
    map.set(id, (map.get(id) || 0) + quantity);
  }
  return map;
}

// Descuenta stock con UNA operación atómica por producto ("stock >= cantidad" y "$inc" en la misma query).
// Si algún producto no alcanza, devuelve lo que ya se había descontado.
async function reserveStock(entries) {
  const done = [];
  const updated = [];
  for (const [productId, quantity] of entries) {
    const doc = await Product.findOneAndUpdate(
      { _id: productId, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true }
    );
    if (!doc) {
      await releaseStock(done);
      return { ok: false, productId: String(productId) };
    }
    done.push([productId, quantity]);
    updated.push(doc);
  }
  return { ok: true, updated };
}

async function releaseStock(entries) {
  for (const [productId, quantity] of entries) {
    await Product.updateOne({ _id: productId }, { $inc: { stock: quantity } });
  }
}

// Cancela una venta: solo UNA petición gana la transición completada -> cancelada,
// y solo quien gana devuelve el stock (nunca se devuelve dos veces).
async function cancelSale(id) {
  const before = await Sale.findOneAndUpdate(
    { _id: id, status: 'completada' },
    { $set: { status: 'cancelada', cancelledAt: new Date() } }
  ); // devuelve el documento tal como estaba ANTES del cambio
  if (!before) return false;
  await releaseStock(before.products.map((p) => [p.productId, p.quantity]));
  return true;
}

// Reintento con la misma Idempotency-Key: misma venta -> se devuelve la original; otra venta -> 409
function replay(res, existing, requested, paymentMethod) {
  const same =
    existing.paymentMethod === paymentMethod &&
    existing.products.length === requested.size &&
    existing.products.every((p) => requested.get(String(p.productId)) === p.quantity);
  return same
    ? res.status(200).json({ msg: 'Venta ya registrada', sale: existing })
    : res.status(409).json({ msg: 'Esa Idempotency-Key ya se usó con otra venta' });
}

// Crear una venta
router.post('/', verifyToken, validateCreateSale, handleValidation, async (req, res) => {
  const { paymentMethod } = req.body;
  const rawKey = req.get('Idempotency-Key');
  const idempotencyKey = rawKey ? `${req.user.id}:${rawKey}` : undefined;
  const requested = mergeItems(req.body.products);

  if (idempotencyKey) {
    const existing = await Sale.findOne({ idempotencyKey });
    if (existing) return replay(res, existing, requested, paymentMethod);
  }

  const docs = await Product.find({ _id: { $in: [...requested.keys()] } }).lean();
  const byId = new Map(docs.map((d) => [String(d._id), d]));

  const lines = [];
  for (const [id, quantity] of requested) {
    const p = byId.get(id);
    if (!p) return res.status(404).json({ msg: `Producto no encontrado: ${id}` });
    lines.push({ productId: p._id, name: p.name, quantity, price: p.price, subtotal: round2(quantity * p.price) });
  }
  const total = round2(lines.reduce((sum, l) => sum + l.subtotal, 0));
  const entries = lines.map((l) => [l.productId, l.quantity]);

  const reservation = await reserveStock(entries);
  if (!reservation.ok) {
    const failed = lines.find((l) => String(l.productId) === reservation.productId);
    return res.status(400).json({ msg: `Stock insuficiente para: ${failed.name}` });
  }

  let sale;
  try {
    sale = await Sale.create({ seller: req.user.id, products: lines, total, paymentMethod, idempotencyKey });
  } catch (err) {
    await releaseStock(entries); // si la venta no se pudo guardar, el stock vuelve
    if (err.code === 11000 && idempotencyKey) {
      // Dos peticiones con la misma clave llegaron a la vez: gana la primera, esta devuelve la original
      const existing = await Sale.findOne({ idempotencyKey });
      if (existing) return replay(res, existing, requested, paymentMethod);
    }
    throw err;
  }

  const alerts = reservation.updated
    .filter((p) => p.stock <= LOW_STOCK)
    .map((p) => ({
      productId: p._id,
      name: p.name,
      stock: p.stock,
      msg: `El stock del producto "${p.name}" es bajo: ${p.stock} unidades restantes`,
    }));

  res.status(201).json({
    msg: 'Venta registrada exitosamente',
    sale,
    alerts: alerts.length > 0 ? alerts : undefined,
  });
});

// Obtener ventas (seller: solo las suyas)
router.get('/', verifyToken, async (req, res) => {
  const sales = await Sale.find(scope(req))
    .populate('seller', 'name email')
    .sort({ createdAt: -1 })
    .limit(500);
  res.json({ sales });
});

// Obtener una venta por ID (seller: solo si es suya)
router.get('/:id', verifyToken, validId, async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, ...scope(req) }).populate('seller', 'name email');
  if (!sale) return res.status(404).json({ msg: 'Venta no encontrada' });
  res.json({ sale });
});

// Actualizar una venta (solo admin). Las ventas canceladas no se modifican.
router.put('/:id', verifyToken, isAdmin, validId, validateUpdateSale, handleValidation, async (req, res) => {
  const { products, paymentMethod, status } = req.body;

  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ msg: 'Venta no encontrada' });
  if (sale.status === 'cancelada') {
    return res.status(400).json({ msg: 'Una venta cancelada no se puede modificar' });
  }

  if (status === 'cancelada') {
    if (!(await cancelSale(sale._id))) {
      return res.status(409).json({ msg: 'La venta ya fue modificada, recarga la lista' });
    }
    return res.json({ msg: 'Venta cancelada y stock revertido' });
  }

  const set = {};
  if (paymentMethod) set.paymentMethod = paymentMethod;
  const toReserve = [];
  const toRelease = [];

  if (products) {
    const requested = mergeItems(products);
    const current = new Map(sale.products.map((p) => [String(p.productId), p]));

    // Productos nuevos en la venta: nombre y precio actuales. Los que ya estaban conservan su precio original.
    const newIds = [...requested.keys()].filter((id) => !current.has(id));
    const fresh = new Map(
      (await Product.find({ _id: { $in: newIds } }).lean()).map((d) => [String(d._id), d])
    );

    const lines = [];
    for (const [id, quantity] of requested) {
      const src = current.get(id) || fresh.get(id);
      if (!src) return res.status(404).json({ msg: `Producto no encontrado: ${id}` });
      lines.push({ productId: id, name: src.name, quantity, price: src.price, subtotal: round2(quantity * src.price) });
    }

    // Solo se mueve la DIFERENCIA de stock por producto
    for (const id of new Set([...requested.keys(), ...current.keys()])) {
      const diff = (requested.get(id) || 0) - (current.get(id)?.quantity || 0);
      if (diff > 0) toReserve.push([id, diff]);
      if (diff < 0) toRelease.push([id, -diff]);
    }

    set.products = lines;
    set.total = round2(lines.reduce((sum, l) => sum + l.subtotal, 0));
  }

  const reservation = await reserveStock(toReserve);
  if (!reservation.ok) {
    const failed = set.products.find((l) => l.productId === reservation.productId);
    return res.status(400).json({ msg: `Stock insuficiente para: ${failed.name}` });
  }

  // Control optimista: si otra petición cambió la venta mientras tanto, no se pisa
  let updated;
  try {
    updated = await Sale.findOneAndUpdate(
      { _id: sale._id, status: 'completada', __v: sale.__v },
      { $set: set, $inc: { __v: 1 } },
      { new: true }
    );
  } catch (err) {
    await releaseStock(toReserve);
    throw err;
  }
  if (!updated) {
    await releaseStock(toReserve);
    return res.status(409).json({ msg: 'La venta cambió mientras la editabas. Recarga e intenta de nuevo.' });
  }

  await releaseStock(toRelease);
  res.json({ msg: 'Venta actualizada', sale: updated });
});

// "Eliminar" una venta (solo admin): se cancela y se revierte el stock; el registro se conserva.
router.delete('/:id', verifyToken, isAdmin, validId, async (req, res) => {
  if (await cancelSale(req.params.id)) {
    return res.json({ msg: 'Venta cancelada y stock revertido' });
  }
  const exists = await Sale.exists({ _id: req.params.id });
  res.status(exists ? 400 : 404).json({ msg: exists ? 'La venta ya estaba cancelada' : 'Venta no encontrada' });
});

module.exports = router;