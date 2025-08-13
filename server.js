const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const userRoutes = require('./routes/user');
const productRoutes = require('./routes/product');
const saleRoutes = require('./routes/sale');
const reportsRoutes = require('./routes/report');

dotenv.config();
const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'https://pos-app-rouge.vercel.app'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch((err) => console.error('Error en MongoDB:', err));

// Rutas
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/reports', reportsRoutes);

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.send('Bienvenido al servidor backend');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto: ${PORT}`);
});