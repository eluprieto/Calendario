const router      = require('express').Router();
const Booking     = require('../models/Booking');
const BlockedSlot = require('../models/BlockedSlot');
const auth        = require('../middleware/auth');

const TIME_SLOTS = [
  '09:00','10:00','11:00','12:00','13:00',
  '14:00','15:00','16:00','17:00','18:00'
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── GET /api/bookings/available?date=YYYY-MM-DD ────────────────────────────
router.get('/available', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || !DATE_RE.test(date)) {
      return res.status(400).json({ error: 'Formato de fecha inválido (YYYY-MM-DD)' });
    }

    // Only Mon–Sat
    const d = new Date(date + 'T00:00:00');
    if (d.getDay() === 0) {
      return res.json({ slots: TIME_SLOTS.map(t => ({ time: t, available: false })) });
    }

    // No past dates
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (d < today) {
      return res.json({ slots: TIME_SLOTS.map(t => ({ time: t, available: false })) });
    }

    const [booked, blocked] = await Promise.all([
      Booking.find({ date, status: { $ne: 'cancelled' } }).select('time'),
      BlockedSlot.find({ date }).select('time')
    ]);

    const taken = new Set([
      ...booked.map(b => b.time),
      ...blocked.map(b => b.time)
    ]);

    res.json({ slots: TIME_SLOTS.map(t => ({ time: t, available: !taken.has(t) })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── POST /api/bookings ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { clientName, phone, service, date, time } = req.body;

    if (!clientName || !phone || !service || !date || !time) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    if (!DATE_RE.test(date)) {
      return res.status(400).json({ error: 'Formato de fecha inválido' });
    }
    if (!TIME_SLOTS.includes(time)) {
      return res.status(400).json({ error: 'Hora inválida' });
    }

    const d = new Date(date + 'T00:00:00');
    if (d.getDay() === 0) {
      return res.status(400).json({ error: 'No hay citas los domingos' });
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (d < today) {
      return res.status(400).json({ error: 'No puedes reservar en el pasado' });
    }

    const [existing, blocked] = await Promise.all([
      Booking.findOne({ date, time, status: { $ne: 'cancelled' } }),
      BlockedSlot.findOne({ date, time })
    ]);

    if (existing || blocked) {
      return res.status(409).json({ error: 'Este horario ya no está disponible' });
    }

    const booking = await Booking.create({
      clientName: clientName.trim(),
      phone: phone.trim(),
      service,
      date,
      time
    });

    res.status(201).json({ message: '¡Reserva confirmada!', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── GET /api/bookings  (admin) ─────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ status: { $ne: 'cancelled' } })
      .sort({ date: 1, time: 1 });
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── PATCH /api/bookings/:id/done  (admin) ──────────────────────────────────
router.patch('/:id/done', auth, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'done' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
    res.json({ booking });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── DELETE /api/bookings/:id  (admin) ──────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
    res.json({ message: 'Reserva cancelada' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
