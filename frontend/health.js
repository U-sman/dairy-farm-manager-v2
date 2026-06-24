/* health.js — Vaccination & Health Records */

requireAdmin();

let cows = [], healthRecords = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    [cows, healthRecords] = await Promise.all([
      apiGet('/api/cows'),
      apiGet('/api/health')
    ]);
  } catch(e) {
    console.error('Load error', e);
  }
  populateSelects();
  renderUpcoming();
  applyHealthFilter();
  initForm();
  document.getElementById('healthDate').value = todayISO();
  document.getElementById('healthReset').addEventListener('click', () => {
    document.getElementById('healthForm').reset();
    document.getElementById('healthId').value = '';
    document.getElementById('healthDate').value = todayISO();
  });
});

function initForm() {
  document.getElementById('healthForm').addEventListener('submit', saveHealth);
}

function showToast(msg, type='info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show toast-${type}`;
  setTimeout(() => t.classList.remove('show'), 3500);
}

function logout() {
  if (!confirm('Logout?')) return;
  localStorage.removeItem('dm_token');
  localStorage.removeItem('dm_role');
  window.location.href = 'login.html';
}

function populateSelects() {
  const opts = cows.map(c => `<option value="${c._id}">${escapeHtml(c.name)}</option>`).join('');
  document.getElementById('healthCow').innerHTML = '<option value="">--select--</option>' + opts;
  document.getElementById('filterCow').innerHTML = '<option value="">--all--</option>' + opts;
}

function renderUpcoming() {
  const today = todayISO();
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const in30ISO = in30.toISOString().slice(0, 10);
  
  const upcoming = healthRecords.filter(h => h.nextDueDate && h.nextDueDate <= in30ISO && h.nextDueDate >= today)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  const el = document.getElementById('upcomingBox');
  if (!upcoming.length) {
    el.innerHTML = '<div class="small muted">No health events scheduled</div>';
    return;
  }

  el.innerHTML = upcoming.map(h => {
    const daysLeft = Math.ceil((new Date(h.nextDueDate) - new Date(today)) / (1000 * 3600 * 24));
    const cow = cows.find(c => c._id === h.cowId);
    const color = daysLeft <= 3 ? 'var(--danger)' : daysLeft <= 7 ? 'var(--warning)' : 'var(--accent)';
    return `<div class="alert-item" style="border-left:4px solid ${color}">
      <span><strong>${cow?.name || 'Unknown'}</strong> · ${h.type}</span>
      <span>${h.description} — Due in ${daysLeft} days (${formatDate(h.nextDueDate)})</span>
    </div>`;
  }).join('');
}

async function saveHealth(e) {
  e.preventDefault();
  const id = document.getElementById('healthId').value;
  const payload = {
    cowId: document.getElementById('healthCow').value,
    date: document.getElementById('healthDate').value,
    type: document.getElementById('healthType').value,
    description: document.getElementById('healthDesc').value,
    medicine: document.getElementById('healthMed').value,
    vet: document.getElementById('healthVet').value,
    nextDueDate: document.getElementById('healthNext').value,
    cost: Number(document.getElementById('healthCost').value || 0),
    notes: document.getElementById('healthNotes').value
  };

  if (!payload.cowId || !payload.date || !payload.type || !payload.description) {
    showToast('Fill required fields', 'error');
    return;
  }

  try {
    let res;
    if (id) {
      res = await apiPut('/api/health/' + id, payload);
    } else {
      res = await apiPost('/api/health', payload);
    }
    if (!res?.ok) {
      const d = await res?.json();
      showToast(d?.error || 'Error saving record', 'error');
      return;
    }
    healthRecords = await apiGet('/api/health');
    renderUpcoming();
    applyHealthFilter();
    document.getElementById('healthForm').reset();
    document.getElementById('healthId').value = '';
    document.getElementById('healthDate').value = todayISO();
    showToast(`Record ${id ? 'updated' : 'saved'} ✓`, 'success');
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function deleteHealth(id) {
  if (!confirm('Delete health record?')) return;
  try {
    await apiDelete('/api/health/' + id);
    healthRecords = await apiGet('/api/health');
    renderUpcoming();
    applyHealthFilter();
    showToast('Deleted ✓', 'success');
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  }
}

function editHealth(id) {
  const h = healthRecords.find(x => x._id === id);
  if (!h) return;
  document.getElementById('healthId').value = h._id;
  document.getElementById('healthCow').value = h.cowId;
  document.getElementById('healthDate').value = h.date;
  document.getElementById('healthType').value = h.type;
  document.getElementById('healthDesc').value = h.description;
  document.getElementById('healthMed').value = h.medicine || '';
  document.getElementById('healthVet').value = h.vet || '';
  document.getElementById('healthNext').value = h.nextDueDate || '';
  document.getElementById('healthCost').value = h.cost || '';
  document.getElementById('healthNotes').value = h.notes || '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`Editing record for ${cows.find(c => c._id === h.cowId)?.name}`, 'info');
}

function applyHealthFilter() {
  const cowId = document.getElementById('filterCow').value;
  const type = document.getElementById('filterType').value;

  let filtered = healthRecords;
  if (cowId) filtered = filtered.filter(h => h.cowId === cowId);
  if (type) filtered = filtered.filter(h => h.type === type);
  filtered = filtered.sort((a, b) => b.date.localeCompare(a.date));

  const el = document.getElementById('healthList');
  if (!filtered.length) {
    el.innerHTML = '<div class="small muted">No records found</div>';
    return;
  }

  el.innerHTML = filtered.map(h => {
    const cow = cows.find(c => c._id === h.cowId);
    const typeEmoji = {
      vaccination: '💉',
      treatment: '💊',
      checkup: '🩺',
      deworming: '🌿'
    }[h.type] || '📋';
    return `<div class="health-card" style="padding:12px;border-left:4px solid var(--accent);background:var(--card);border-radius:8px">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div>
          <span style="font-size:16px">${typeEmoji}</span>
          <strong>${escapeHtml(h.description)}</strong>
          <div class="small muted" style="margin-top:4px">${cow?.name || '?'} · ${formatDate(h.date)}</div>
          ${h.medicine ? `<div class="small">💊 ${escapeHtml(h.medicine)}</div>` : ''}
          ${h.vet ? `<div class="small">👨‍⚕️ ${escapeHtml(h.vet)}</div>` : ''}
          ${h.nextDueDate ? `<div class="small">🔔 Next: ${formatDate(h.nextDueDate)}</div>` : ''}
          ${h.cost > 0 ? `<div class="small">💰 Rs ${h.cost}</div>` : ''}
          ${h.notes ? `<div class="small" style="margin-top:6px;font-style:italic">"${escapeHtml(h.notes)}"</div>` : ''}
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn ghost sm" onclick="editHealth('${h._id}')">Edit</button>
          <button class="btn ghost sm danger" onclick="deleteHealth('${h._id}')">Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
