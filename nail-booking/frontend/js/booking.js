/* ─────────────────────────────────────────────────────────────────
   booking.js  –  Public booking page (mobile-first, pink redesign)
───────────────────────────────────────────────────────────────── */

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS_SHORT   = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];

let selectedService = null;
let selectedDate    = null;
let selectedTime    = null;

// ── Service selection ─────────────────────────────────────────────────────

function selectService(value) {
  selectedService = value;

  // Sync hidden select so submitBooking() validation works unchanged
  document.getElementById('service').value = value;

  document.querySelectorAll('.service-card').forEach(card => {
    const isThis = card.dataset.service === value;
    card.classList.toggle('selected', isThis);
    card.setAttribute('aria-pressed', String(isThis));
  });
}

// ── Date pill strip ───────────────────────────────────────────────────────

function renderDatePills() {
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const container = document.getElementById('date-pills');
  let html = '';

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const isSun = d.getDay() === 0;
    if (isSun) continue;

    const dateStr = toDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const isSel   = dateStr === selectedDate;

    const dayAbbr = DAYS_SHORT[d.getDay()];
    const dayNum  = d.getDate();
    const monAbbr = MONTHS_SHORT[d.getMonth()];

    const cls = 'date-pill' + (isSel ? ' selected' : '');

    html += `
      <button class="${cls}" role="listitem" type="button"
              aria-label="${dayAbbr} ${dayNum} de ${monAbbr}"
              aria-pressed="${isSel}"
              onclick="selectDate('${dateStr}')">
        <span class="pill-dow">${dayAbbr}</span>
        <span class="pill-num">${dayNum}</span>
        <span class="pill-mon">${monAbbr}</span>
      </button>`;
  }

  container.innerHTML = html;
}

// ── Date selection ────────────────────────────────────────────────────────

async function selectDate(dateStr) {
  selectedDate = dateStr;
  selectedTime = null;

  // Update pill visual state
  document.querySelectorAll('.date-pill').forEach(pill => {
    const isThis = pill.getAttribute('onclick').includes(`'${dateStr}'`);
    pill.classList.toggle('selected', isThis);
    pill.setAttribute('aria-pressed', String(isThis));
  });

  updateCtaBtn();

  const section = document.getElementById('time-slots-section');
  const grid    = document.getElementById('time-slots-grid');
  section.style.display = 'block';
  grid.innerHTML =
    `<div class="loading" style="grid-column:1/-1">
       <div class="spinner"></div> Cargando…
     </div>`;

  if (window.innerWidth < 700) {
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  try {
    const res  = await fetch(`/api/bookings/available?date=${dateStr}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    renderTimeSlots(data.slots);
  } catch (err) {
    grid.innerHTML =
      `<p class="error-msg visible" style="grid-column:1/-1">
         ${err.message || 'Error al cargar horarios'}
       </p>`;
  }
}

// ── Time slot rendering ───────────────────────────────────────────────────

function renderTimeSlots(slots) {
  const grid   = document.getElementById('time-slots-grid');
  const hasAny = slots.some(s => s.available);

  let html = '';
  slots.forEach(s => {
    if (s.available) {
      const sel = s.time === selectedTime ? ' selected' : '';
      html += `
        <button class="time-slot${sel}" role="listitem" type="button"
                aria-pressed="${s.time === selectedTime}"
                onclick="selectTime('${s.time}')">
          ${s.time}
        </button>`;
    } else {
      html += `
        <button class="time-slot taken" role="listitem" type="button"
                disabled aria-disabled="true">
          ${s.time}
        </button>`;
    }
  });

  if (!hasAny) {
    html += `<p class="no-slots-msg">Sin horarios disponibles este día</p>`;
  }

  grid.innerHTML = html;
}

// ── Time selection ────────────────────────────────────────────────────────

function selectTime(time) {
  selectedTime = time;
  updateCtaBtn();

  document.querySelectorAll('.time-slot:not(.taken)').forEach(btn => {
    const isThis = btn.textContent.trim() === time;
    btn.classList.toggle('selected', isThis);
    btn.setAttribute('aria-pressed', String(isThis));
  });

  if (window.innerWidth < 700) {
    document.getElementById('booking-form')
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ── CTA button state ──────────────────────────────────────────────────────

function updateCtaBtn() {
  const btn = document.getElementById('cta-btn');
  btn.disabled = !(selectedDate && selectedTime);
}

// ── Form submission ───────────────────────────────────────────────────────

async function submitBooking(e) {
  e.preventDefault();

  const clientName = document.getElementById('clientName').value.trim();
  const phone      = document.getElementById('phone').value.trim();
  const service    = document.getElementById('service').value;

  clearError();

  if (!service)      { return showError('Por favor selecciona un servicio'); }
  if (!selectedDate) { return showError('Por favor selecciona una fecha'); }
  if (!selectedTime) { return showError('Por favor selecciona un horario'); }
  if (!clientName)   { return showError('Por favor ingresa tu nombre'); }
  if (!phone)        { return showError('Por favor ingresa tu número de teléfono'); }

  const btn = document.getElementById('cta-btn');
  btn.disabled    = true;
  btn.textContent = 'Confirmando…';

  try {
    const res  = await fetch('/api/bookings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ clientName, phone, service, date: selectedDate, time: selectedTime })
    });
    const data = await res.json();

    if (res.ok) {
      showConfirmation(data.booking);
    } else {
      showError(data.error || 'No se pudo completar la reserva');
      btn.disabled    = false;
      btn.textContent = 'Reservar';
      if (data.error && data.error.includes('disponible')) {
        await selectDate(selectedDate);
        selectedTime = null;
        updateCtaBtn();
      }
    }
  } catch {
    showError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    btn.disabled    = false;
    btn.textContent = 'Reservar';
  }
}

// ── Full-screen confirmation ──────────────────────────────────────────────

function showConfirmation(booking) {
  const dateObj = new Date(booking.date + 'T00:00:00');
  const fmtDate = dateObj.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  document.getElementById('conf-name').textContent    = booking.clientName;
  document.getElementById('conf-service').textContent = booking.service;
  document.getElementById('conf-date').textContent    = fmtDate;
  document.getElementById('conf-time').textContent    = booking.time + ' hs';

  const overlay = document.getElementById('confirm-overlay');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function resetBooking() {
  selectedService = null;
  selectedDate    = null;
  selectedTime    = null;

  document.getElementById('booking-form').reset();
  document.getElementById('service').value = '';

  document.querySelectorAll('.service-card').forEach(card => {
    card.classList.remove('selected');
    card.setAttribute('aria-pressed', 'false');
  });

  const section = document.getElementById('time-slots-section');
  section.style.display = 'none';
  document.getElementById('time-slots-grid').innerHTML = '';

  document.getElementById('confirm-overlay').classList.remove('active');
  document.body.style.overflow = '';

  const btn = document.getElementById('cta-btn');
  btn.disabled    = true;
  btn.textContent = 'Reservar';

  clearError();
  renderDatePills();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.add('visible');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearError() {
  const el = document.getElementById('error-msg');
  el.textContent = '';
  el.classList.remove('visible');
}

function toDateStr(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

// ── Init ──────────────────────────────────────────────────────────────────
renderDatePills();
updateCtaBtn();
