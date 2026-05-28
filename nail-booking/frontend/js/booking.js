/* ─────────────────────────────────────────────────────────────────
   booking.js  –  Public booking page (mobile-first)
───────────────────────────────────────────────────────────────── */

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

let selectedDate = null;
let selectedTime = null;
let calYear      = new Date().getFullYear();
let calMonth     = new Date().getMonth();

// ── Calendar ──────────────────────────────────────────────────────────────

function renderCalendar() {
  const today    = new Date(); today.setHours(0,0,0,0);
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMo = new Date(calYear, calMonth + 1, 0).getDate();

  document.getElementById('month-title').textContent =
    `${MONTHS[calMonth]} ${calYear}`;

  let html = '';

  DAYS.forEach(d => {
    html += `<div class="cal-header">${d}</div>`;
  });

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day empty" aria-hidden="true"></div>`;
  }

  for (let day = 1; day <= daysInMo; day++) {
    const date    = new Date(calYear, calMonth, day);
    const dateStr = toDateStr(calYear, calMonth + 1, day);
    const dow     = date.getDay();
    const isPast  = date < today;
    const isSun   = dow === 0;
    const isToday = date.toDateString() === today.toDateString();
    const isSel   = dateStr === selectedDate;

    let cls = 'cal-day';
    if (isPast || isSun) cls += ' disabled';
    if (isToday) cls += ' today';
    if (isSel)   cls += ' selected';

    if (!isPast && !isSun) {
      html += `<div class="${cls}" role="button" tabindex="0"
                 aria-label="${day} de ${MONTHS[calMonth]}"
                 aria-pressed="${isSel}"
                 onclick="selectDate('${dateStr}')"
                 onkeydown="if(event.key==='Enter'||event.key===' ')selectDate('${dateStr}')"
               >${day}</div>`;
    } else {
      html += `<div class="${cls}" aria-disabled="true">${day}</div>`;
    }
  }

  document.getElementById('calendar').innerHTML =
    `<div class="calendar-grid">${html}</div>`;
}

function prevMonth() {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function nextMonth() {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

// ── Date selection ────────────────────────────────────────────────────────

async function selectDate(dateStr) {
  selectedDate = dateStr;
  selectedTime = null;
  renderCalendar();
  updateStickyBar();

  const section = document.getElementById('time-slots-section');
  section.style.display = 'block';
  section.innerHTML = `
    <p class="slots-title">Selecciona un horario</p>
    <div class="loading"><div class="spinner"></div> Cargando horarios…</div>`;

  // On mobile, scroll down to show the time slots right after the calendar
  if (window.innerWidth < 700) {
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  try {
    const res  = await fetch(`/api/bookings/available?date=${dateStr}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    renderTimeSlots(data.slots);
  } catch (err) {
    section.innerHTML =
      `<p class="error-msg visible">${err.message || 'Error al cargar horarios'}</p>`;
  }
}

// ── Time slot rendering ───────────────────────────────────────────────────

function renderTimeSlots(slots) {
  const section = document.getElementById('time-slots-section');
  const hasAny  = slots.some(s => s.available);

  // Vertical stacked list on mobile (full-width pill buttons)
  let html = `<p class="slots-title">Selecciona un horario</p>
    <div class="slots-grid" role="list">`;

  slots.forEach(s => {
    if (s.available) {
      const sel = s.time === selectedTime ? ' selected' : '';
      html += `
        <button class="time-slot available${sel}"
                role="listitem"
                aria-pressed="${s.time === selectedTime}"
                onclick="selectTime('${s.time}')">
          ${s.time}
        </button>`;
    } else {
      html += `
        <button class="time-slot unavailable" role="listitem"
                disabled aria-disabled="true">
          ${s.time}
        </button>`;
    }
  });

  html += '</div>';

  if (!hasAny) {
    html += `<p class="slots-empty">Sin horarios disponibles este día</p>`;
  }

  section.innerHTML = html;
}

// ── Time selection ────────────────────────────────────────────────────────

function selectTime(time) {
  selectedTime = time;
  updateStickyBar();

  // Update pressed state
  document.querySelectorAll('.time-slot.available').forEach(btn => {
    const isThis = btn.textContent.trim() === time;
    btn.classList.toggle('selected', isThis);
    btn.setAttribute('aria-pressed', isThis);
  });

  // On mobile, scroll down to the form so user can fill in their details
  if (window.innerWidth < 700) {
    document.getElementById('form-card')
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ── Sticky bar (mobile CTA) ───────────────────────────────────────────────

function updateStickyBar() {
  const promptEl    = document.getElementById('cta-prompt');
  const selectionEl = document.getElementById('cta-selection');
  const stickyBtn   = document.getElementById('sticky-btn');

  if (selectedDate && selectedTime) {
    const fmtDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
    promptEl.style.display    = 'none';
    selectionEl.style.display = 'block';
    selectionEl.textContent   = `📅 ${fmtDate}  ·  🕐 ${selectedTime}`;
    stickyBtn.disabled        = false;
  } else if (selectedDate) {
    promptEl.textContent      = 'Ahora selecciona una hora';
    promptEl.style.display    = 'block';
    selectionEl.style.display = 'none';
    stickyBtn.disabled        = true;
  } else {
    promptEl.textContent      = 'Selecciona fecha y hora';
    promptEl.style.display    = 'block';
    selectionEl.style.display = 'none';
    stickyBtn.disabled        = true;
  }

  // Also keep the booking summary pill in the form card in sync
  const summary = document.getElementById('booking-summary');
  if (selectedDate || selectedTime) {
    const fmtDate = selectedDate
      ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES',{
          weekday:'short', day:'numeric', month:'short'
        })
      : '—';
    summary.textContent = `📅 ${fmtDate}  ·  🕐 ${selectedTime || '—'}`;
    summary.classList.add('visible');
  } else {
    summary.classList.remove('visible');
  }
}

// ── Form submission ───────────────────────────────────────────────────────

async function submitBooking(e) {
  e.preventDefault();

  const clientName = document.getElementById('clientName').value.trim();
  const phone      = document.getElementById('phone').value.trim();
  const service    = document.getElementById('service').value;

  clearError();

  if (!selectedDate) { return showError('Por favor selecciona una fecha en el calendario'); }
  if (!selectedTime) { return showError('Por favor selecciona un horario'); }
  if (!service)      { return showError('Por favor selecciona un servicio'); }
  if (!clientName)   { return showError('Por favor ingresa tu nombre'); }
  if (!phone)        { return showError('Por favor ingresa tu número de teléfono'); }

  // Disable both buttons
  const inlineBtn  = document.getElementById('submit-btn');
  const stickyBtn  = document.getElementById('sticky-btn');
  setLoading(true, inlineBtn, stickyBtn);

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
      setLoading(false, inlineBtn, stickyBtn);
      // If the slot just got taken, refresh availability
      if (data.error && data.error.includes('disponible')) {
        await selectDate(selectedDate);
        selectedTime = null;
        updateStickyBar();
      }
    }
  } catch {
    showError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    setLoading(false, inlineBtn, stickyBtn);
  }
}

function setLoading(loading, ...btns) {
  btns.forEach(btn => {
    if (!btn) return;
    btn.disabled    = loading;
    btn.textContent = loading ? 'Confirmando…' : (btn === document.getElementById('sticky-btn') ? 'Reservar' : 'Confirmar Reserva');
  });
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

  // Hide sticky bar while overlay is shown
  document.getElementById('sticky-cta').style.display = 'none';

  // Show full-screen overlay with animation
  const overlay = document.getElementById('confirm-overlay');
  overlay.classList.add('active');
  // Prevent background scroll
  document.body.style.overflow = 'hidden';
}

function resetBooking() {
  selectedDate = null;
  selectedTime = null;

  document.getElementById('booking-form').reset();
  document.getElementById('time-slots-section').style.display = 'none';
  document.getElementById('time-slots-section').innerHTML = '';
  document.getElementById('confirm-overlay').classList.remove('active');
  document.getElementById('sticky-cta').style.display = '';
  document.body.style.overflow = '';

  const inlineBtn = document.getElementById('submit-btn');
  const stickyBtn = document.getElementById('sticky-btn');
  inlineBtn.textContent = 'Confirmar Reserva';
  stickyBtn.textContent = 'Reservar';

  clearError();
  updateStickyBar();
  renderCalendar();
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
renderCalendar();
updateStickyBar();
