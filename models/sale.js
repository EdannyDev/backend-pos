const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      name: { type: String },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      subtotal: { type: Number, required: true }
    }
  ],
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['efectivo', 'tarjeta', 'transferencia'], required: true },
  status: { type: String, enum: ['completada', 'cancelada'], default: 'completada' }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);