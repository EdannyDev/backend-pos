const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const userRoutes = require('./routes/user');
const productRoutes = require('./routes/product');
const saleRoutes = require('./routes/sale');
const reportsRoutes = require('./routes/report');

dotenv.config();

for (const key of ['MONGO_URI', 'JWT_SECRET', 'FRONTEND_URL']) {
  if (!process.env[key]) {
    console.error(`Falta la variable de entorno ${key}`);
    process.exit(1);
  }
}

const app = express();

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: process.env.FRONTEND_URL,
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
  res.json({ msg: 'Bienvenido al backend del POS' });
});

// Manejador de errores: nunca se devuelve el stack ni el mensaje interno al cliente
app.use((err, req, res, next) => {
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ msg: status === 500 ? 'Error interno del servidor' : 'Solicitud inválida' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto: ${PORT}`);
});