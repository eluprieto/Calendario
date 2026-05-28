const router      = require('express').Router();
const BlockedSlot = require('../models/BlockedSlot');
const auth        = require('../middleware/auth');

const TIME_SLOTS = [
  '09:00','10:00','11:00','12:00','13:00',
  '14:00','15:00','16:00','17:00','18:00'
];

// ── POST /api/slots/block  (admin) ─────────────────────────────────────────
router.post('/block', auth, async (req, res) => {
  try {
    const { date, time } = req.body;
    if (!date || !time) {
      return res.status(400).json({ error: 'Fecha y hora requeridas' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Formato de fecha inválido' });
    }
    if (!TIME_SLOTS.includes(time)) {
      return res.status(400).json({ error: 'Hora inválida' });
    }

    const slot = await BlockedSlot.create({ date, time }).catch(err => {
      if (err.code === 11000) return null; // duplicate
      throw err;
    });

    if (!slot) {
      return res.status(409).json({ error: 'Este horario ya está bloqueado' });
    }

    res.status(201).json({ message: 'Horario bloqueado', slot });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── GET /api/slots/blocked  (admin) ───────────────────────────────────────
router.get('/blocked', auth, async (req, res) => {
  try {
    const slots = await BlockedSlot.find().sort({ date: 1, time: 1 });
    res.json({ slots });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── DELETE /api/slots/block/:id  (admin) ──────────────────────────────────
router.delete('/block/:id', auth, async (req, res) => {
  try {
    const slot = await BlockedSlot.findByIdAndDelete(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Horario bloqueado no encontrado' });
    res.json({ message: 'Horario desbloqueado' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
