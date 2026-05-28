const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  clientName: { type: String, required: true, trim: true },
  phone:       { type: String, required: true, trim: true },
  service:     {
    type: String,
    required: true,
    enum: ['Manicura', 'Esmaltado semipermanente', 'Nail art']
  },
  date:   { type: String, required: true }, // YYYY-MM-DD
  time:   { type: String, required: true }, // HH:MM
  status: {
    type: String,
    enum: ['pending', 'done', 'cancelled'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
