const mongoose = require('mongoose');

const blockedSlotSchema = new mongoose.Schema({
  date:      { type: String, required: true }, // YYYY-MM-DD
  time:      { type: String, required: true }, // HH:MM
  createdAt: { type: Date, default: Date.now }
});

blockedSlotSchema.index({ date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('BlockedSlot', blockedSlotSchema);
