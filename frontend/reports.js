/* reports.js — Advanced Analytics & Reports */

requireAuth();

let cows = [], milk = [], expenses = [], milkRate = 130;
let charts = {};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    [cows, milk, expenses] = await Promise.all([
      apiGet('/api/cows'),
      apiGet('/api/milk'),
      apiGet('/api/expenses')
    ]);
    const r = await apiGet('/api/rates/1');
    milkRate = r?.value || 130;
  } catch(e) { console.error('Load error', e); }

  // Set date range to last 12 months
  const today = new Date();
  const last12 = new Date(); last12.setMonth(last12.getMonth() - 12);
  document.getElementById('reportStartDate').value = last12.toISOString().slice(0, 10);
  document.getElementById('reportEndDate').value = today.toISOString().slice(0, 10);

  reloadReports();
});

function showToast(msg, type = 'info') {
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

async function reloadReports() {
  try {
    [cows, milk, expenses] = await Promise.all([
      apiGet('/api/cows'),
      apiGet('/api/milk'),
      apiGet('/api/expenses')
    ]);
  } catch(e) { showToast('Load error', 'error'); }
  renderAll();
}

function renderAll() {
  renderSummary();
  renderHerdHealth();
  renderPerCow();
  renderTrendsChart();
  renderExpenseChart();
  renderProductivityRanking();
}

function filterByDates(data) {
  const start = document.getElementById('reportStartDate').value;
  const end = document.getElementById('reportEndDate').value;
  if (!start || !end) return data;
  return data.filter(d => d.date >= start && d.date <= end);
}

function renderSummary() {
  const filtered = filterByDates(milk);
  const expFiltered = filterByDates(expenses);

  const totalL = filtered.reduce((s, m) => s + ((+m.morning || 0) + (+m.evening || 0)), 0);
  const totalRev = totalL * milkRate;
  const totalExp = expFiltered.reduce((s, e) => s + (+e.amount || 0), 0);
  const totalProfit = totalRev - totalExp;
  const profitMargin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : 0;

  const days = new Set(filtered.map(m => m.date)).size || 1;

  document.getElementById('totalMilkAll').textContent = totalL.toFixed(1) + ' L';
  document.getElementById('totalMilkAvgDay').textContent = `${(totalL / days).toFixed(1)} L/day avg`;

  document.getElementById('totalRev').textContent = 'Rs ' + totalRev.toLocaleString('en-PK', { maximumFractionDigits: 0 });
  document.getElementById('totalRevAvg').textContent = `${(totalRev / days).toFixed(0)} Rs/day`;

  document.getElementById('totalExp').textContent = 'Rs ' + totalExp.toLocaleString('en-PK', { maximumFractionDigits: 0 });
  document.getElementById('totalExpAvg').textContent = `${(totalExp / days).toFixed(0)} Rs/day`;

  const pEl = document.getElementById('totalProfit');
  pEl.textContent = 'Rs ' + Math.abs(totalProfit).toLocaleString('en-PK', { maximumFractionDigits: 0 });
  pEl.style.color = totalProfit >= 0 ? 'var(--success)' : 'var(--danger)';
  document.getElementById('profitMargin').textContent = `${profitMargin}% margin`;
}

function renderHerdHealth() {
  const active = cows.filter(c => c.status === 'active').length;
  const dryPregnant = cows.filter(c => c.status === 'dry' || c.status === 'pregnant').length;
  const ages = cows.map(c => c.ageYears || 0).filter(a => a > 0);
  const avgAge = ages.length > 0 ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1) : 0;

  const avgs = computeAvgPerCow();
  const lowYield = cows.filter(c => c.status === 'active' && avgs[c._id] > 0 && avgs[c._id] < 3).length;

  document.getElementById('activeCount').textContent = active;
  document.getElementById('dryCount').textContent = dryPregnant;
  document.getElementById('avgAge').textContent = avgAge + ' yrs';
  document.getElementById('lowYieldCount').textContent = lowYield;
}

function renderPerCow() {
  const filtered = filterByDates(milk);
  const expFiltered = filterByDates(expenses);

  const cowData = {};
  cows.forEach(c => {
    const cowMilk = filtered.filter(m => m.cowId === c._id);
    const cowExp = expFiltered.filter(e => e.cowId === c._id);
    const totalL = cowMilk.reduce((s, m) => s + ((+m.morning || 0) + (+m.evening || 0)), 0);
    const totalExp = cowExp.reduce((s, e) => s + (+e.amount || 0), 0);
    const totalRev = totalL * milkRate;
    const profit = totalRev - totalExp;
    const days = new Set(cowMilk.map(m => m.date)).size || 1;

    cowData[c._id] = {
      name: c.name,
      totalL: totalL.toFixed(1),
      avgDay: (totalL / days).toFixed(1),
      revenue: totalRev.toFixed(0),
      expense: totalExp.toFixed(0),
      profit: profit.toFixed(0),
      profitMargin: totalRev > 0 ? ((profit / totalRev) * 100).toFixed(1) : 0
    };
  });

  const el = document.getElementById('perCowSummary');
  el.innerHTML = Object.entries(cowData).map(([id, data]) => {
    const profit = parseFloat(data.profit);
    const color = profit >= 0 ? 'var(--success)' : 'var(--danger)';
    return `<div class="card" style="border-left:4px solid ${color}">
      <h4>${escapeHtml(data.name)}</h4>
      <div class="summary-cards">
        <div><span class="small">Total Milk</span><strong>${data.totalL} L</strong></div>
        <div><span class="small">Daily Avg</span><strong>${data.avgDay} L</strong></div>
        <div><span class="small">Revenue</span><strong>Rs ${(+data.revenue).toLocaleString('en-PK')}</strong></div>
        <div><span class="small">Expense</span><strong>Rs ${(+data.expense).toLocaleString('en-PK')}</strong></div>
        <div><span class="small">Profit/Loss</span><strong style="color:${color}">Rs ${(+data.profit).toLocaleString('en-PK')}</strong></div>
        <div><span class="small">Margin</span><strong>${data.profitMargin}%</strong></div>
      </div>
    </div>`;
  }).join('');
}

function renderTrendsChart() {
  const filtered = filterByDates(milk);
  const expFiltered = filterByDates(expenses);

  const monthMap = {};
  filtered.forEach(m => {
    const k = m.date.slice(0, 7);
    if (!monthMap[k]) monthMap[k] = { milk: 0, rev: 0, exp: 0, days: new Set() };
    const l = (+m.morning || 0) + (+m.evening || 0);
    monthMap[k].milk += l;
    monthMap[k].rev += l * milkRate;
    monthMap[k].days.add(m.date);
  });
  expFiltered.forEach(e => {
    const k = e.date.slice(0, 7);
    if (!monthMap[k]) monthMap[k] = { milk: 0, rev: 0, exp: 0, days: new Set() };
    monthMap[k].exp += +e.amount || 0;
  });

  const keys = Object.keys(monthMap).sort();
  const labels = keys.map(k => {
    const [y, m] = k.split('-');
    return new Date(y, m - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
  });
  const milkData = keys.map(k => monthMap[k].milk);
  const revData = keys.map(k => monthMap[k].rev);
  const expData = keys.map(k => monthMap[k].exp);

  const ctx = document.getElementById('trendsChart').getContext('2d');
  if (charts.trends) charts.trends.destroy();
  charts.trends = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Milk (L)', data: milkData, borderColor: 'var(--accent)', backgroundColor: 'rgba(8,145,178,0.1)', yAxisID: 'y', tension: 0.3 },
        { label: 'Revenue (Rs)', data: revData, borderColor: 'var(--success)', backgroundColor: 'rgba(16,185,129,0.1)', yAxisID: 'y1', tension: 0.3 },
        { label: 'Expense (Rs)', data: expData, borderColor: 'var(--danger)', backgroundColor: 'rgba(239,68,68,0.1)', yAxisID: 'y1', tension: 0.3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Liters' } },
        y1: { position: 'right', beginAtZero: true, title: { display: true, text: 'Rs' } }
      },
      plugins: { legend: { position: 'top' } }
    }
  });
}

function renderExpenseChart() {
  const filtered = filterByDates(expenses);
  const cats = {};
  filtered.forEach(e => { cats[e.type] = (cats[e.type] || 0) + (+e.amount || 0); });

  const labels = Object.keys(cats);
  const data = Object.values(cats);
  const colors = ['#0891b2', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  const ctx = document.getElementById('expCategoryChart').getContext('2d');
  if (charts.expCat) charts.expCat.destroy();
  if (!labels.length) return;
  charts.expCat = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 2 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
  });
}

function renderProductivityRanking() {
  const avgs = computeAvgPerCow();
  const ranking = cows
    .filter(c => c.status === 'active')
    .map(c => ({ name: c.name, avg: avgs[c._id] || 0 }))
    .sort((a, b) => b.avg - a.avg);

  const el = document.getElementById('productivityRanking');
  if (!ranking.length) { el.innerHTML = '<div class="small muted">No data</div>'; return; }

  el.innerHTML = '<div style="display:grid;gap:8px">' +
    ranking.map((c, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      return `<div class="progress-item" style="display:flex;align-items:center;gap:12px">
        <span style="font-size:18px;width:30px">${medal}</span>
        <span style="min-width:100px"><strong>${escapeHtml(c.name)}</strong></span>
        <div style="flex:1;height:24px;background:rgba(0,0,0,.05);border-radius:12px;overflow:hidden">
          <div style="height:100%;width:${(c.avg / 15) * 100}%;background:var(--accent);transition:width 0.3s"></div>
        </div>
        <strong style="min-width:60px;text-align:right">${c.avg.toFixed(1)} L/day</strong>
      </div>`;
    }).join('') + '</div>';
}

function computeAvgPerCow() {
  const today = new Date();
  const ago = new Date(); ago.setDate(today.getDate() - 30);
  const agoISO = ago.toISOString().slice(0, 10);
  const recent = milk.filter(m => m.date >= agoISO);
  const totals = {}, days = {};
  recent.forEach(m => {
    totals[m.cowId] = (totals[m.cowId] || 0) + ((+m.morning || 0) + (+m.evening || 0));
    if (!days[m.cowId]) days[m.cowId] = new Set();
    days[m.cowId].add(m.date);
  });
  const result = {};
  Object.keys(totals).forEach(id => { result[id] = totals[id] / (days[id].size || 30); });
  return result;
}
