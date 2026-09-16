const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const compression = require('compression');
const helmet = require('helmet');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/authRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const aiRoutes = require('./routes/aiRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

dotenv.config();
const app = express();
app.set('trust proxy', 1);

// Middlewares
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS - Localhost aur Vercel frontend dono allowed
const allowedOrigins = [
  'http://localhost:5173',
  'https://seapearl-frontend.vercel.app',
  'https://seapearl-luxury.vercel.app'
];

app.use(cors({ 
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS'));
    }
  },
  credentials: true 
}));

// DB Connection with Production Pooling
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 50,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
  .then(() => console.log('SeaPearl DB Connected ✅'))
  .catch((err) => console.error('DB Connection Error ❌', err.message));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/hotels', apiLimiter, hotelRoutes);
app.use('/api/ai', apiLimiter, aiRoutes); 
app.use('/api/bookings', bookingRoutes);
app.get('/', (req, res) => res.send('SeaPearl API Active'));

// Production-Safe Error Handler (Information Leak Block)
app.use((err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));