require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const Admin    = require('../models/Admin');

async function seedAdmin() {
  const email    = (process.env.ADMIN_EMAIL || 'admin@nail.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin1234';

  await mongoose.connect(process.env.MONGODB_URI);

  const exists = await Admin.findOne({ email });
  if (exists) {
    console.log(`ℹ️  El admin ${email} ya existe`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await Admin.create({ email, passwordHash });
    console.log(`✅  Admin creado: ${email}`);
  }

  await mongoose.disconnect();
}

seedAdmin()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌  Error creando admin:', err.message);
    process.exit(1);
  });
