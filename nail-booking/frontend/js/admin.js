/* ─────────────────────────────────────────────────────────────────
   admin.js  –  Admin panel (mobile-first)
───────────────────────────────────────────────────────────────── */

let token = localStorage.getItem('adminToken');

// ── Auth ──────────────────────────────────────────────────────────────────

function checkAuth() {
  if (token) {
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-section').style.display    = 'flex';
  document.getElementById('dashboard-section').style.display = 'none';
}

function showDashboard() {
  document.getElementById('login-section').style.display    = 'none';
  document.getElementById('dashboard-section').style.display = 'block';
  loadBookings();
  loadBlockedSlots();
}

async function adminLogin(e) {
  e.preventDefault();

  const email    = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  errEl.classList.remove('visible');
  btn.disabled    = true;
  btn.textContent = 'Iniciando sesión…';

  try {
    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (res.ok) {
      token = data.token;
      localStorage.setItem('adminToken', token);
      showDashboard();
    } else {
      errEl.textContent = data.error || 'Credenciales incorrectas';
      errEl.classList.add('visible');
    }
  } catch {
    errEl.textContent = 'Error de conexión';
    errEl.classList.add('visible');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Iniciar sesión';
  }
}

function adminLogout() {
  token = null;
  localStorage.removeItem('adminToken');
  showLogin();
}

function handleUnauth(res) {
  if (res.status === 401) { adminLogout(); return true; }
  return false;
}

// ── Bookings ──────────────────────────────────────────────────────────────

async function loadBookings() {
  document.getElementById('bookings-list').innerHTML =
    `<div class="loading"><div class="spinner"></div> Cargando…</div>`;

  try {
    const res  = await fetch('/api/bookings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (handleUnauth(res)) return;

    const data = await res.json();
    renderBookings(data.bookings || []);
  } catch {
    document.getElementById('bookings-list').innerHTML =
      `<div class="empty-state">
         <span class="empty-icon">⚠️</span>
         <p>Error al cargar reservas</p>
       </div>`;
  }
}

function renderBookings(bookings) {
  updateStats(bookings, todayStr());

  const container = document.getElementById('bookings-list');

  if (!bookings.length) {
    container.innerHTML =
      `<div class="empty-state">
         <span class="empty-icon">🌸</span>
         <p>No hay reservas próximas</p>
       </div>`;
    return;
  }

  const today = todayStr();

  // Group by date
  const groups = {};
  bookings.forEach(b => {
    if (!groups[b.date]) groups[b.date] = [];
    groups[b.date].push(b);
  });

  let html = '';

  Object.keys(groups).sort().forEach(date => {
    html += `<div class="date-group">
      <span class="date-label">${formatDateLabel(date, today)}</span>`;

    groups[date]
      .sort((a, b) => a.time.localeCompare(b.time))
      .forEach(booking => {
        const isDone = booking.status === 'done';
        html += buildBookingCard(booking, isDone);
      });

    html += `</div>`;
  });

  container.innerHTML = html;
}

function buildBookingCard(booking, isDone) {
  return `
    <div class="booking-card${isDone ? ' done' : ''}">

      <div class="booking-top">
        <div class="booking-time">${booking.time}</div>
        <span class="status-badge ${isDone ? 'badge-done' : 'badge-pending'}">
          ${isDone ? 'Completado' : 'Confirmado'}
        </span>
      </div>

      <div class="booking-info">
        <div class="booking-name">${esc(booking.clientName)}</div>
        <div class="booking-service">✨ ${esc(booking.service)}</div>
        <a href="tel:${esc(booking.phone)}" class="booking-phone">
          📞 ${esc(booking.phone)}
        </a>
      </div>

      <div class="booking-actions">
        ${!isDone
          ? `<button class="btn-done" onclick="markDone('${booking._id}')">
               ✓ Listo
             </button>`
          : ''}
        <button class="btn-cancel" onclick="cancelBooking('${booking._id}', this)">
          ✕ Cancelar
        </button>
      </div>

    </div>`;
}

function updateStats(bookings, today) {
  document.getElementById('stat-today').textContent =
    bookings.filter(b => b.date === today && b.status === 'pending').length;
  document.getElementById('stat-upcoming').textContent =
    bookings.filter(b => b.date >= today && b.status === 'pending').length;
  document.getElementById('stat-done').textContent =
    bookings.filter(b => b.status === 'done').length;
}

async function markDone(id) {
  try {
    const res = await fetch(`/api/bookings/${id}/done`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (handleUnauth(res)) return;
    if (res.ok) {
      showToast('Reserva marcada como completada', 'success');
      loadBookings();
    }
  } catch {
    showToast('Error al actualizar', 'error');
  }
}

async function cancelBooking(id, btn) {
  if (!confirm('¿Cancelar esta reserva? Esta acción no se puede deshacer.')) return;

  btn.disabled    = true;
  btn.textContent = 'Cancelando…';

  try {
    const res = await fetch(`/api/bookings/${id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (handleUnauth(res)) return;
    if (res.ok) {
      showToast('Reserva cancelada', 'success');
      loadBookings();
    } else {
      btn.disabled    = false;
      btn.textContent = '✕ Cancelar';
    }
  } catch {
    showToast('Error al cancelar', 'error');
    btn.disabled    = false;
    btn.textContent = '✕ Cancelar';
  }
}

// ── Blocked Slots ─────────────────────────────────────────────────────────

async function loadBlockedSlots() {
  document.getElementById('blocked-slots-list').innerHTML =
    `<div class="loading"><div class="spinner"></div> Cargando…</div>`;

  try {
    const res  = await fetch('/api/slots/blocked', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (handleUnauth(res)) return;

    const data = await res.json();
    renderBlockedSlots(data.slots || []);
  } catch {
    document.getElementById('blocked-slots-list').innerHTML =
      `<p class="error-msg visible">Error al cargar</p>`;
  }
}

function renderBlockedSlots(slots) {
  const container = document.getElementById('blocked-slots-list');

  if (!slots.length) {
    container.innerHTML =
      `<div class="empty-state" style="padding:1.5rem 1rem">
         <span class="empty-icon">🔓</span>
         <p>Sin horarios bloqueados</p>
       </div>`;
    return;
  }

  let html = '';
  slots.forEach(slot => {
    const d     = new Date(slot.date + 'T00:00:00');
    const label = d.toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' });
    html += `
      <div class="blocked-item">
        <span>📅 ${label} &nbsp;·&nbsp; 🕐 ${slot.time}</span>
        <button class="btn-unblock" onclick="unblockSlot('${slot._id}')"
                aria-label="Desbloquear ${label} ${slot.time}">✕</button>
      </div>`;
  });

  container.innerHTML = html;
}

async function blockSlot(e) {
  e.preventDefault();

  const date  = document.getElementById('block-date').value;
  const time  = document.getElementById('block-time').value;
  const errEl = document.getElementById('block-error');
  errEl.classList.remove('visible');

  if (!date || !time) {
    errEl.textContent = 'Selecciona fecha y hora';
    errEl.classList.add('visible');
    return;
  }

  try {
    const res  = await fetch('/api/slots/block', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`
      },
      body: JSON.stringify({ date, time })
    });
    if (handleUnauth(res)) return;

    const data = await res.json();
    if (res.ok) {
      showToast('Horario bloqueado', 'success');
      document.getElementById('block-date').value = '';
      document.getElementById('block-time').value = '';
      loadBlockedSlots();
    } else {
      errEl.textContent = data.error || 'Error al bloquear';
      errEl.classList.add('visible');
    }
  } catch {
    errEl.textContent = 'Error de conexión';
    errEl.classList.add('visible');
  }
}

async function unblockSlot(id) {
  try {
    const res = await fetch(`/api/slots/block/${id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (handleUnauth(res)) return;
    if (res.ok) {
      showToast('Horario desbloqueado', 'success');
      loadBlockedSlots();
    }
  } catch {
    showToast('Error al desbloquear', 'error');
  }
}

// ── Tabs ──────────────────────────────────────────────────────────────────

function showTab(name, e) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  if (e && e.currentTarget) e.currentTarget.classList.add('active');
}

// ── Helpers ───────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateLabel(dateStr, today) {
  const d     = new Date(dateStr + 'T00:00:00');
  const fmt   = d.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  if (dateStr === today) return `HOY · ${fmt}`;
  const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
  const tmrStr = `${tmr.getFullYear()}-${String(tmr.getMonth()+1).padStart(2,'0')}-${String(tmr.getDate()).padStart(2,'0')}`;
  if (dateStr === tmrStr) return `MAÑANA · ${fmt}`;
  return fmt;
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function showToast(msg, type = '') {
  const c     = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className   = `toast ${type}`;
  toast.textContent = msg;
  c.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ── Init ──────────────────────────────────────────────────────────────────
checkAuth();

// Auto-refresh every 60s while dashboard is visible
setInterval(() => {
  if (token && document.getElementById('dashboard-section').style.display !== 'none') {
    loadBookings();
  }
}, 60_000);
