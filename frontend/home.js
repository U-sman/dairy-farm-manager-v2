/* home.js — Usman Dairy Farm Dashboard v2 */

requireAuth();

let cows = [], milk = [], expenses = [], milkRate = 130, buyers = [];
let charts = {};

document.addEventListener('DOMContentLoaded', init);

function init() {
  initTheme();
  setupControls();
  loadAll();
  setInterval(loadAll, 60000);
}

/* ── Theme ── */
function initTheme() {
  const dark = localStorage.getItem('dm_dark') === '1';
  document.body.classList.toggle('dark', dark);
  const t = document.getElementById('darkToggle');
  t.checked = dark;
  t.addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('dm_dark', e.target.checked ? '1' : '0');
  });
}

function logout() {
  if (!confirm('Logout?')) return;
  localStorage.removeItem('dm_token');
  localStorage.removeItem('dm_role');
  localStorage.removeItem('dm_username');
  window.location.href = 'login.html';
}

/* ── Controls ── */
function setupControls() {
  document.getElementById('weekdayRange').addEventListener('change', e => {
    const c = e.target.value;
    document.getElementById('startDate').style.display = c === 'custom' ? 'inline-block' : 'none';
    document.getElementById('endDate').style.display   = c === 'custom' ? 'inline-block' : 'none';
  });
  document.getElementById('updateRanges').addEventListener('click', renderWeekdayAverages);
}

/* ── Data ── */
async function loadAll() {
  try {
    [cows, milk, expenses] = await Promise.all([
      apiGet('/api/cows'), apiGet('/api/milk'), apiGet('/api/expenses')
    ]);
    try {
      const rateObj = await apiGet('/api/rates/1');
      milkRate = rateObj?.value || 130;
    } catch { milkRate = 130; }
    try { buyers = await apiGet('/api/buyers'); } catch { buyers = []; }
  } catch (e) {
    console.error('Load error', e);
  }
  renderAll();
}

/* ── Render All ── */
function renderAll() {
  renderSummaryCards();
  renderCowsGrid();
  renderTodayMilk();
  renderDailyMilkChart();
  renderRevExpChart();
  renderExpensePieChart();
  renderCowComparison();
  renderWeekdayAverages();
  computeAlerts();
  renderMonthComparison();
}

/* ── Summary Cards ── */
function renderSummaryCards() {
  const active   = cows.filter(c => c.status === 'active').length;
  const inactive = cows.filter(c => c.status !== 'active').length;
  document.getElementById('totalCows').textContent = cows.length;
  document.getElementById('cowBreakdown').textContent = `${active} active · ${inactive} inactive`;

  const today = todayISO();
  const yDate = new Date(); yDate.setDate(yDate.getDate()-1);
  const yesterday = yDate.toISOString().slice(0,10);

  const todayL = milk.filter(m=>m.date===today).reduce((s,m)=>s+(+m.morning||0)+(+m.evening||0),0);
  const yestL  = milk.filter(m=>m.date===yesterday).reduce((s,m)=>s+(+m.morning||0)+(+m.evening||0),0);
  document.getElementById('totalMilkToday').textContent = todayL.toFixed(2) + ' L';
  const chg = todayL - yestL;
  const chgEl = document.getElementById('milkChange');
  chgEl.textContent = chg === 0 ? 'Same as yesterday' : (chg>0?'+':'')+chg.toFixed(2)+' L vs yesterday';
  chgEl.style.color = chg >= 0 ? 'var(--success)' : 'var(--danger)';

  document.getElementById('currentRate').textContent = 'Rs ' + milkRate;

  // Top cow
  const avgs = computeAvgPerCow();
  const topId = Object.entries(avgs).sort((a,b)=>b[1]-a[1])[0];
  if (topId) {
    const c = cows.find(x=>x._id===topId[0]);
    document.getElementById('topCow').textContent    = c ? c.name : '-';
    document.getElementById('topCowAvg').textContent = topId[1].toFixed(1) + ' L/day avg';
  }

  // Monthly P&L
  const thisMonth = today.slice(0,7);
  const monthMilk = milk.filter(m=>m.date.startsWith(thisMonth));
  const monthExp  = expenses.filter(e=>e.date.startsWith(thisMonth));
  const rev  = monthMilk.reduce((s,m)=>s+(+m.morning||0)+(+m.evening||0),0) * milkRate;
  const exp  = monthExp.reduce((s,e)=>s+(+e.amount||0),0);
  const profit = rev - exp;
  const pEl = document.getElementById('monthProfit');
  pEl.textContent = 'Rs ' + Math.abs(profit).toLocaleString();
  pEl.style.color = profit >= 0 ? 'var(--success)' : 'var(--danger)';
  document.getElementById('monthPLBreakdown').textContent =
    (profit>=0?'Profit':'Loss') + ' · Rev Rs '+rev.toFixed(0)+' · Exp Rs '+exp.toFixed(0);
}

/* ── Month Comparison ── */
function renderMonthComparison() {
  const today = todayISO();
  const thisMonth = today.slice(0,7);
  const lastMonthDate = new Date(); lastMonthDate.setMonth(lastMonthDate.getMonth()-1);
  const lastMonth = lastMonthDate.toISOString().slice(0,7);

  const calcRev = (month) => milk.filter(m=>m.date.startsWith(month))
    .reduce((s,m)=>s+(+m.morning||0)+(+m.evening||0),0) * milkRate;
  const calcExp = (month) => expenses.filter(e=>e.date.startsWith(month))
    .reduce((s,e)=>s+(+e.amount||0),0);

  const thisRev = calcRev(thisMonth), lastRev = calcRev(lastMonth);
  const thisExp = calcExp(thisMonth), lastExp = calcExp(lastMonth);

  document.getElementById('thisMonthRev').textContent = 'Rs ' + thisRev.toLocaleString('en-PK',{maximumFractionDigits:0});
  document.getElementById('thisMonthExp').textContent = 'Rs ' + thisExp.toLocaleString('en-PK',{maximumFractionDigits:0});

  const revChg = lastRev > 0 ? ((thisRev-lastRev)/lastRev*100).toFixed(1) : 0;
  const expChg = lastExp > 0 ? ((thisExp-lastExp)/lastExp*100).toFixed(1) : 0;
  const revEl = document.getElementById('thisMonthRevVs');
  const expEl = document.getElementById('thisMonthExpVs');
  revEl.textContent = revChg >= 0 ? `▲ ${revChg}% vs last month` : `▼ ${Math.abs(revChg)}% vs last month`;
  revEl.style.color = revChg >= 0 ? 'var(--success)' : 'var(--danger)';
  expEl.textContent = expChg >= 0 ? `▲ ${expChg}% vs last month` : `▼ ${Math.abs(expChg)}% vs last month`;
  expEl.style.color = expChg <= 0 ? 'var(--success)' : 'var(--danger)';
}

/* ── Cow Grid ── */
function renderCowsGrid() {
  const root = document.getElementById('cowGrid');
  root.innerHTML = '';
  const avgs = computeAvgPerCow();
  cows.forEach(c => {
    const avg = avgs[c._id] || 0;
    const card = document.createElement('div');
    card.className = 'cow-card';
    if (c.status !== 'active') card.classList.add('inactive');
    if (c.status === 'active' && avg < 3 && avg > 0) card.classList.add('low');
    card.style.cursor = 'pointer';
    card.onclick = () => showCowDetails(c._id);
    card.innerHTML = `
      ${c.image ? `<img src="${escapeHtml(c.image)}" alt="" loading="lazy"/>` : '<div class="cow-no-img">🐄</div>'}
      <div><strong>${escapeHtml(c.name)}</strong> <span class="small">(${escapeHtml(c.breed)})</span></div>
      <div class="small">Status: <span class="status-badge status-${c.status}">${c.status}</span></div>
      ${avg>0 ? `<div class="small">Avg: <strong>${avg.toFixed(1)} L/day</strong></div>` : ''}
      ${c.calvingDate ? `<div class="small">Calved: ${formatDate(c.calvingDate)}</div>` : ''}
    `;
    root.appendChild(card);
  });
}

/* ── Today's Milk ── */
function renderTodayMilk() {
  const today = todayISO();
  const rows = milk.filter(m => m.date === today);
  const totalL = rows.reduce((s,m)=>s+(+m.morning||0)+(+m.evening||0),0);
  const income = totalL * milkRate;
  const todayExp = expenses.filter(e=>e.date===today).reduce((s,e)=>s+(+e.amount||0),0);

  document.getElementById('todayTotal').textContent = totalL.toFixed(2) + ' L';
  let html = `<div class="today-stats">
    <span>💰 Income: <strong>Rs ${income.toFixed(0)}</strong></span>
    <span>💸 Expense: <strong>Rs ${todayExp.toFixed(0)}</strong></span>
    <span style="color:${income-todayExp>=0?'var(--success)':'var(--danger)'}">📊 Profit: <strong>Rs ${(income-todayExp).toFixed(0)}</strong></span>
  </div><hr style="margin:10px 0;border:none;border-top:1px solid rgba(0,0,0,.06)"/>`;
  html += rows.map(m => {
    const cow = cows.find(c=>c._id===m.cowId);
    const total = (+m.morning||0)+(+m.evening||0);
    return `<div class="milk-row"><span>🐄 ${cow?escapeHtml(cow.name):'??'}</span><span>${total.toFixed(1)} L <small>(${m.morning||0}↑ ${m.evening||0}↓)</small></span></div>`;
  }).join('') || '<div class="small muted">No milk entries today</div>';
  document.getElementById('todayBreakdown').innerHTML = html;
}

/* ── Charts ── */
function renderDailyMilkChart() {
  const days = 30, today = new Date();
  const map = {};
  for (let i=0; i<days; i++) {
    const d = new Date(today); d.setDate(today.getDate()-(days-1-i));
    map[d.toISOString().slice(0,10)] = 0;
  }
  milk.forEach(m => { if (map.hasOwnProperty(m.date)) map[m.date] += (+m.morning||0)+(+m.evening||0); });
  const labels = Object.keys(map).map(d => d.slice(5));
  const data   = Object.values(map);
  const ctx = document.getElementById('dailyMilkChart').getContext('2d');
  if (charts.daily) charts.daily.destroy();
  charts.daily = new Chart(ctx, {
    type:'line', data:{ labels, datasets:[{ label:'L/day', data, borderColor:'var(--success)',
      backgroundColor:'rgba(16,185,129,0.15)', tension:0.3, pointRadius:2, fill:true }]},
    options:{ responsive:true, maintainAspectRatio:false,
      scales:{ y:{beginAtZero:true}, x:{ticks:{maxTicksLimit:10,maxRotation:45}} },
      plugins:{ legend:{display:false} } }
  });
}

function renderRevExpChart() {
  const monthMap = {};
  milk.forEach(m => {
    const k = m.date.slice(0,7);
    if (!monthMap[k]) monthMap[k] = {rev:0,exp:0};
    monthMap[k].rev += ((+m.morning||0)+(+m.evening||0)) * milkRate;
  });
  expenses.forEach(e => {
    const k = e.date.slice(0,7);
    if (!monthMap[k]) monthMap[k] = {rev:0,exp:0};
    monthMap[k].exp += +e.amount||0;
  });
  const keys = Object.keys(monthMap).sort().slice(-6);
  const labels = keys.map(k => { const [y,m]=k.split('-'); return new Date(y,m-1).toLocaleString('default',{month:'short',year:'2-digit'}); });
  const profits = keys.map(k => monthMap[k].rev - monthMap[k].exp);
  const ctx = document.getElementById('revExpChart').getContext('2d');
  if (charts.revExp) charts.revExp.destroy();
  charts.revExp = new Chart(ctx, {
    type:'bar',
    data:{ labels, datasets:[
      { label:'Revenue', data:keys.map(k=>monthMap[k].rev), backgroundColor:'rgba(8,145,178,0.8)' },
      { label:'Expense', data:keys.map(k=>monthMap[k].exp), backgroundColor:'rgba(239,68,68,0.8)' },
      { label:'Profit', data:profits, type:'line', borderColor:'var(--success)', backgroundColor:'transparent', tension:0.3, pointRadius:3 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      scales:{ y:{beginAtZero:true} }, plugins:{ legend:{ position:'top' } } }
  });
}

function renderExpensePieChart() {
  const cats = {};
  expenses.forEach(e => { cats[e.type] = (cats[e.type]||0) + (+e.amount||0); });
  const labels = Object.keys(cats);
  const data   = Object.values(cats);
  const colors = ['#0891b2','#ef4444','#10b981','#f59e0b','#8b5cf6'];
  const ctx = document.getElementById('expensePieChart').getContext('2d');
  if (charts.pie) charts.pie.destroy();
  if (!labels.length) return;
  charts.pie = new Chart(ctx, {
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor:colors.slice(0,labels.length), borderWidth:2 }]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right' } } }
  });
}

function renderCowComparison() {
  const avgs = computeAvgPerCow();
  const activeCows = cows.filter(c=>c.status==='active');
  const ctx = document.getElementById('cowComparison').getContext('2d');
  if (charts.cowComp) charts.cowComp.destroy();
  charts.cowComp = new Chart(ctx, {
    type:'bar',
    data:{ labels:activeCows.map(c=>c.name),
      datasets:[{ label:'Avg L/day', data:activeCows.map(c=>avgs[c._id]||0),
        backgroundColor:'rgba(8,145,178,0.8)', borderRadius:6 }]},
    options:{ responsive:true, maintainAspectRatio:false,
      scales:{ y:{beginAtZero:true} }, plugins:{ legend:{display:false} } }
  });
}

function renderWeekdayAverages() {
  const range = document.getElementById('weekdayRange').value;
  let start = new Date(), end = new Date();
  if (range==='thisMonth') { start.setDate(1); }
  else if (range==='lastMonth') {
    start = new Date(start.getFullYear(), start.getMonth()-1, 1);
    end   = new Date(end.getFullYear(), end.getMonth(), 0);
  } else if (range==='custom') {
    const s=document.getElementById('startDate').value, e=document.getElementById('endDate').value;
    if (s&&e) { start=new Date(s); end=new Date(e); } else { start.setDate(start.getDate()-30); }
  } else { start.setDate(start.getDate()-30); }

  const sISO=start.toISOString().slice(0,10), eISO=end.toISOString().slice(0,10);
  const filtered = milk.filter(m=>m.date>=sISO && m.date<=eISO);
  const totals=[0,0,0,0,0,0,0], counts=[0,0,0,0,0,0,0];
  const tmp = new Date(start);
  while (tmp.toISOString().slice(0,10)<=eISO) { counts[tmp.getDay()]++; tmp.setDate(tmp.getDate()+1); }
  filtered.forEach(m => {
    const d = new Date(m.date+'T00:00:00').getDay();
    totals[d] += (+m.morning||0)+(+m.evening||0);
  });
  const avgs = totals.map((t,i) => counts[i]>0 ? (t/counts[i]).toFixed(2) : 0);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const list = document.getElementById('weekdayList');
  list.innerHTML = days.map((d,i)=>`<div class="weekday-item"><span>${d}</span><strong>${avgs[i]} L</strong></div>`).join('');
  const ctx = document.getElementById('weekdayChart').getContext('2d');
  if (charts.weekday) charts.weekday.destroy();
  charts.weekday = new Chart(ctx, {
    type:'bar',
    data:{ labels:days, datasets:[{ label:'Avg L', data:avgs, backgroundColor:'rgba(8,145,178,0.8)', borderRadius:4 }]},
    options:{ responsive:true, maintainAspectRatio:false, scales:{y:{beginAtZero:true}}, plugins:{legend:{display:false}} }
  });
}

/* ── Alerts ── */
function computeAlerts() {
  const alerts = [];
  const today = todayISO();
  const d7 = new Date(); d7.setDate(d7.getDate()-7);
  const d7ISO = d7.toISOString().slice(0,10);

  // Missing data 3 days
  cows.filter(c=>c.status==='active').forEach(c => {
    let missing = true;
    for (let d=0;d<3;d++) { const dt=new Date(); dt.setDate(dt.getDate()-d);
      if (milk.some(m=>m.cowId===c._id && m.date===dt.toISOString().slice(0,10))) { missing=false; break; }
    }
    if (missing) alerts.push({ type:'danger', msg:`${c.name}: no milk data for 3+ days` });
  });

  // Low yield
  const recent = milk.filter(m=>m.date>=d7ISO);
  const cowTotals = {};
  recent.forEach(m => { cowTotals[m.cowId]=(cowTotals[m.cowId]||0)+(+m.morning||0)+(+m.evening||0); });
  Object.entries(cowTotals).forEach(([id,tot]) => {
    const avg = tot/7;
    if (avg>0 && avg<4) {
      const c = cows.find(x=>x._id===id);
      alerts.push({ type:'warning', msg:`${c?c.name:id}: low yield ${avg.toFixed(1)} L/day avg` });
    }
  });

  // High expense
  const recentExp = expenses.filter(e=>e.date>=d7ISO);
  const expByCow = {};
  recentExp.forEach(e=>{ expByCow[e.cowId]=(expByCow[e.cowId]||0)+(+e.amount||0); });
  Object.entries(expByCow).forEach(([id,amt]) => {
    if (amt>2000) {
      const c=cows.find(x=>x._id===id);
      alerts.push({ type:'warning', msg:`${c?c.name:id}: high expenses Rs ${amt} last 7 days` });
    }
  });

  // No alerts
  if (!alerts.length) alerts.push({ type:'success', msg:'All cows recorded · No issues detected' });

  const box = document.getElementById('alertsBox');
  box.innerHTML = alerts.map(a=>`<div class="alert-item alert-${a.type}">
    ${a.type==='danger'?'🔴':a.type==='warning'?'🟡':'🟢'} ${escapeHtml(a.msg)}
  </div>`).join('');
  const cnt = alerts.filter(a=>a.type!=='success').length;
  document.getElementById('alertCount').textContent = cnt > 0 ? cnt : '';
  document.getElementById('alertCount').style.display = cnt > 0 ? 'inline' : 'none';
}

/* ── Cow Modal ── */
window.showCowDetails = function(cowId) {
  const cow = cows.find(c=>c._id===cowId); if(!cow) return;
  document.getElementById('modalCowName').textContent = `🐄 ${cow.name}`;
  document.getElementById('modalCowDetails').innerHTML = `
    <div class="modal-info-grid">
      <div><label>Breed</label><span>${escapeHtml(cow.breed)}</span></div>
      <div><label>Age</label><span>${cow.ageYears||'-'} yrs</span></div>
      <div><label>Weight</label><span>${cow.weight||'-'} kg</span></div>
      <div><label>Status</label><span class="status-badge status-${cow.status}">${cow.status}</span></div>
      <div><label>Lactation #</label><span>${cow.lactationNumber||'-'}</span></div>
      <div><label>Calving Date</label><span>${formatDate(cow.calvingDate)}</span></div>
      ${cow.notes?`<div style="grid-column:1/-1"><label>Notes</label><span>${escapeHtml(cow.notes)}</span></div>`:''}
    </div>
  `;
  const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate()-30);
  const cowMilk = milk.filter(m=>m.cowId===cowId && new Date(m.date)>=thirtyAgo).sort((a,b)=>a.date.localeCompare(b.date));
  const dMap = {};
  for(let i=29;i>=0;i--) { const d=new Date(); d.setDate(d.getDate()-i); dMap[d.toISOString().slice(0,10)]=0; }
  cowMilk.forEach(m => { dMap[m.date]=(+m.morning||0)+(+m.evening||0); });
  const ctx = document.getElementById('cowHistoryChart').getContext('2d');
  if (charts.cowHistory) charts.cowHistory.destroy();
  charts.cowHistory = new Chart(ctx, {
    type:'line',
    data:{ labels:Object.keys(dMap).map(d=>d.slice(5)),
      datasets:[{ label:'L/day', data:Object.values(dMap), borderColor:'var(--accent)',
        backgroundColor:'rgba(8,145,178,0.15)', tension:0.3, fill:true }]},
    options:{ responsive:true, maintainAspectRatio:false,
      scales:{ y:{beginAtZero:true}, x:{ticks:{maxTicksLimit:10,maxRotation:45}} },
      plugins:{ legend:{display:false} } }
  });
  document.getElementById('cowDetailsModal').style.display = 'flex';
};

window.closeCowModal = function() {
  document.getElementById('cowDetailsModal').style.display = 'none';
};

/* ── Helpers ── */
function computeAvgPerCow() {
  const today = new Date(), ago = new Date(); ago.setDate(today.getDate()-30);
  const agoISO = ago.toISOString().slice(0,10);
  const recent = milk.filter(m=>m.date>=agoISO);
  const totals = {}, days = {};
  recent.forEach(m => {
    totals[m.cowId]=(totals[m.cowId]||0)+(+m.morning||0)+(+m.evening||0);
    if (!days[m.cowId]) days[m.cowId]=new Set();
    days[m.cowId].add(m.date);
  });
  const result = {};
  Object.keys(totals).forEach(id => { result[id] = totals[id]/(days[id].size||30); });
  return result;
}
