require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const path     = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/slots',    require('./routes/slots'));

// Admin page
app.get('/admin', (_req, res) =>
  res.sendFile(path.join(__dirname, '../frontend/admin.html'))
);

// ── Seed default admin ─────────────────────────────────────────────────────
async function seedAdmin() {
  const Admin   = require('./models/Admin');
  const email   = (process.env.ADMIN_EMAIL   || 'admin@nail.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin1234';

  const exists = await Admin.findOne({ email });
  if (!exists) {
    const passwordHash = await bcrypt.hash(password, 12);
    await Admin.create({ email, passwordHash });
    console.log(`✅  Admin creado: ${email}`);
  }
}

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅  MongoDB conectado');
    await seedAdmin();
    app.listen(PORT, () =>
      console.log(`🚀  Servidor en http://localhost:${PORT}`)
    );
  })
  .catch(err => {
    console.error('❌  Error de conexión MongoDB:', err.message);
    process.exit(1);
  });
