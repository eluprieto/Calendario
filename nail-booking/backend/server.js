require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const connectDB = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files (used for local dev; on Vercel these paths
// are served directly by vercel.json rewrites and never reach this app)
app.use(express.static(path.join(__dirname, '../frontend')));

// Ensure a DB connection exists before handling any request. connectDB()
// reuses the cached connection instead of opening a new one each call.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌  Error de conexión MongoDB:', err.message);
    res.status(500).json({ error: 'Error de conexión a la base de datos' });
  }
});

// API routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/slots',    require('./routes/slots'));

// Admin page
app.get('/admin', (_req, res) =>
  res.sendFile(path.join(__dirname, '../frontend/admin.html'))
);

module.exports = app;
