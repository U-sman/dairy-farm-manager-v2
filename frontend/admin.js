/* admin.js — Usman Dairy Farm Admin v2 */

requireAdmin();

let cows=[], milk=[], expenses=[], buyers=[], milkRate=130;
let filteredMilk=[], filteredExpenses=[];
let pendingMilkPayload=null;

/* ── Toast ── */
function showToast(msg, type='info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show toast-${type}`;
  setTimeout(()=>t.classList.remove('show'), 3500);
}

function logout() {
  if (!confirm('Logout?')) return;
  localStorage.removeItem('dm_token'); localStorage.removeItem('dm_role');
  window.location.href = 'login.html';
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
  initForms();
  await fetchAll();
  fetchRate();
  populateSelects();
  applyFilter();
  loadBuyers();
  loadRateHistory();
});

async function fetchAll() {
  try {
    [cows, milk, expenses] = await Promise.all([
      apiGet('/api/cows'), apiGet('/api/milk'), apiGet('/api/expenses')
    ]);
  } catch(e) { showToast('Failed to load data: ' + e.message, 'error'); }
}

/* ── Forms ── */
function initForms() {
  document.getElementById('cowForm').addEventListener('submit', saveCow);
  document.getElementById('cowReset').addEventListener('click', ()=>{ document.getElementById('cowForm').reset(); document.getElementById('cowId').value=''; });
  document.getElementById('milkForm').addEventListener('submit', saveMilk);
  document.getElementById('milkReset').addEventListener('click', ()=>{ document.getElementById('milkForm').reset(); document.getElementById('milkId').value=''; });
  document.getElementById('milkCow').addEventListener('change', showLast3);
  document.getElementById('autoFillLast').addEventListener('click', autoFill);
  document.getElementById('bulkMilkForm').addEventListener('submit', bulkAddMilk);
  document.getElementById('expenseForm').addEventListener('submit', saveExpense);
  document.getElementById('expenseReset').addEventListener('click', ()=>{ document.getElementById('expenseForm').reset(); document.getElementById('expenseId').value=''; });
  document.getElementById('expenseType').addEventListener('change', showLastExpHint);
  document.getElementById('rateForm').addEventListener('submit', saveRate);
  document.getElementById('buyerForm').addEventListener('submit', saveBuyer);
  document.getElementById('buyerReset').addEventListener('click', ()=>{ document.getElementById('buyerForm').reset(); document.getElementById('buyerId').value=''; });
  document.getElementById('applyFilter').addEventListener('click', applyFilter);

  // Set today's date as default
  const today = todayISO();
  document.getElementById('milkDate').value = today;
  document.getElementById('bulkDate').value = today;
  document.getElementById('expenseDate').value = today;
}

/* ── Cows ── */
async function saveCow(e) {
  e.preventDefault();
  const id = document.getElementById('cowId').value;
  const birthDate = document.getElementById('cowBirth').value;
  const ageYears = birthDate
    ? Math.floor((new Date()-new Date(birthDate))/(365.25*24*3600*1000))
    : Number(document.getElementById('cowAge').value||0);
  const payload = {
    name: document.getElementById('cowName').value,
    breed: document.getElementById('cowBreed').value,
    birthDate, ageYears,
    weight: Number(document.getElementById('cowWeight').value||0),
    status: document.getElementById('cowStatus').value,
    lactationNumber: Number(document.getElementById('cowLactation').value||0),
    calvingDate: document.getElementById('cowCalving').value,
    pregnancyDate: document.getElementById('cowPregnancy').value,
    image: document.getElementById('cowImage').value,
    notes: document.getElementById('cowNotes').value
  };
  try {
    let res;
    if (id) { res = await apiPut('/api/cows/'+id, payload); }
    else { payload.id = String(Date.now()); res = await apiPost('/api/cows', payload); }
    if (!res?.ok) { const d=await res?.json(); showToast(d?.error||'Error saving cow','error'); return; }
    await fetchAll(); populateSelects(); applyFilter();
    document.getElementById('cowForm').reset(); document.getElementById('cowId').value='';
    showToast(`Cow ${id?'updated':'added'} ✓`, 'success');
  } catch(err) { showToast('Error: '+err.message, 'error'); }
}

async function deleteCow(id) {
  if (!confirm('Delete cow and ALL related milk/expenses?')) return;
  try {
    await apiDelete('/api/cows/'+id);
    // Delete related milk and expenses
    const relMilk = milk.filter(m=>m.cowId===id);
    const relExp  = expenses.filter(e=>e.cowId===id);
    await Promise.all([
      ...relMilk.map(m=>apiDelete('/api/milk/'+m._id)),
      ...relExp.map(e=>apiDelete('/api/expenses/'+e._id))
    ]);
    await fetchAll(); populateSelects(); applyFilter();
    showToast('Cow deleted ✓', 'success');
  } catch(err) { showToast('Error: '+err.message, 'error'); }
}

function editCow(id) {
  const c = cows.find(x=>x._id===id); if(!c) return;
  document.getElementById('cowId').value = c._id;
  document.getElementById('cowName').value = c.name||'';
  document.getElementById('cowBreed').value = c.breed||'';
  document.getElementById('cowBirth').value = c.birthDate||'';
  document.getElementById('cowAge').value = c.ageYears||'';
  document.getElementById('cowWeight').value = c.weight||'';
  document.getElementById('cowStatus').value = c.status||'active';
  document.getElementById('cowLactation').value = c.lactationNumber||'';
  document.getElementById('cowCalving').value = c.calvingDate||'';
  document.getElementById('cowPregnancy').value = c.pregnancyDate||'';
  document.getElementById('cowImage').value = c.image||'';
  document.getElementById('cowNotes').value = c.notes||'';
  window.scrollTo({top:0,behavior:'smooth'});
  showToast(`Editing: ${c.name}`, 'info');
}

/* ── Milk ── */
async function saveMilk(e) {
  e.preventDefault();
  const id = document.getElementById('milkId').value;
  const payload = {
    cowId: document.getElementById('milkCow').value,
    date:  document.getElementById('milkDate').value,
    morning: Number(document.getElementById('milkMorning').value||0),
    evening: Number(document.getElementById('milkEvening').value||0),
    fatPercent: document.getElementById('milkFat').value ? Number(document.getElementById('milkFat').value) : undefined,
    snfPercent: document.getElementById('milkSNF').value ? Number(document.getElementById('milkSNF').value) : undefined,
    buyerId: document.getElementById('milkBuyer').value || undefined
  };
  if (!payload.cowId || !payload.date) { showToast('Cow and date required','error'); return; }
  try {
    let res;
    if (id) { res = await apiPut('/api/milk/'+id, payload); }
    else { res = await apiPost('/api/milk', payload); }
    if (res?.status === 409) {
      const data = await res.json();
      pendingMilkPayload = { ...payload, forceOverwrite: true };
      document.getElementById('dupMsg').textContent = data.message;
      document.getElementById('dupModal').style.display = 'flex';
      return;
    }
    if (!res?.ok) { const d=await res?.json(); showToast(d?.error||'Error','error'); return; }
    await fetchAll(); applyFilter();
    document.getElementById('milkForm').reset(); document.getElementById('milkId').value='';
    document.getElementById('milkDate').value = todayISO();
    showToast(`Milk entry ${id?'updated':'saved'} ✓`, 'success');
    showLast3();
  } catch(err) { showToast('Error: '+err.message,'error'); }
}

async function confirmOverwrite() {
  document.getElementById('dupModal').style.display='none';
  if (!pendingMilkPayload) return;
  try {
    const res = await apiPost('/api/milk', pendingMilkPayload);
    if (!res?.ok) { const d=await res?.json(); showToast(d?.error||'Error','error'); return; }
    await fetchAll(); applyFilter();
    document.getElementById('milkForm').reset(); document.getElementById('milkId').value='';
    document.getElementById('milkDate').value = todayISO();
    showToast('Entry overwritten ✓','success');
    pendingMilkPayload = null;
  } catch(err) { showToast('Error: '+err.message,'error'); }
}

async function deleteMilk(id) {
  if (!confirm('Delete milk entry?')) return;
  try { await apiDelete('/api/milk/'+id); await fetchAll(); applyFilter(); showToast('Deleted ✓','success'); }
  catch(err) { showToast('Error: '+err.message,'error'); }
}

function editMilk(id) {
  const m = milk.find(x=>x._id===id); if(!m) return;
  document.getElementById('milkId').value = m._id;
  document.getElementById('milkCow').value = m.cowId;
  document.getElementById('milkDate').value = m.date;
  document.getElementById('milkMorning').value = m.morning;
  document.getElementById('milkEvening').value = m.evening;
  document.getElementById('milkFat').value = m.fatPercent||'';
  document.getElementById('milkSNF').value = m.snfPercent||'';
  document.getElementById('milkBuyer').value = m.buyerId||'';
  showLast3();
  window.scrollTo({top:0,behavior:'smooth'});
  showToast(`Editing milk for ${cowName(m.cowId)}`,'info');
}

async function bulkAddMilk(e) {
  e.preventDefault();
  const selected = Array.from(document.querySelectorAll('#bulkCowList input:checked')).map(i=>i.value);
  if (!selected.length) { showToast('Select at least one cow','error'); return; }
  const date    = document.getElementById('bulkDate').value;
  const morning = Number(document.getElementById('bulkMorning').value||0);
  const evening = Number(document.getElementById('bulkEvening').value||0);
  if (!date) { showToast('Date required','error'); return; }
  let added=0, dupes=0;
  for (const cowId of selected) {
    const res = await apiPost('/api/milk', { cowId, date, morning, evening, id:'m'+Date.now()+'_'+cowId });
    if (res?.status===409) dupes++;
    else if (res?.ok) added++;
  }
  await fetchAll(); applyFilter();
  document.getElementById('bulkMilkForm').reset();
  document.getElementById('bulkDate').value = todayISO();
  showToast(`Added ${added} entries${dupes?' ('+dupes+' duplicates skipped)':''}`, 'success');
}

/* ── Expenses ── */
async function saveExpense(e) {
  e.preventDefault();
  const id = document.getElementById('expenseId').value;
  const payload = {
    cowId: document.getElementById('expenseCow').value,
    date:  document.getElementById('expenseDate').value,
    type:  document.getElementById('expenseType').value,
    amount: Number(document.getElementById('expenseAmount').value||0),
    note:  document.getElementById('expenseNote').value
  };
  if (!payload.date) { showToast('Date required','error'); return; }
  try {
    let res;
    if (id) { res = await apiPut('/api/expenses/'+id, payload); }
    else { res = await apiPost('/api/expenses', payload); }
    if (!res?.ok) { const d=await res?.json(); showToast(d?.error||'Error','error'); return; }
    localStorage.setItem('dm_last_exp', JSON.stringify({type:payload.type, amount:payload.amount}));
    await fetchAll(); applyFilter();
    document.getElementById('expenseForm').reset(); document.getElementById('expenseId').value='';
    document.getElementById('expenseDate').value = todayISO();
    showToast(`Expense ${id?'updated':'saved'} ✓`,'success');
    showLastExpHint();
  } catch(err) { showToast('Error: '+err.message,'error'); }
}

async function deleteExpense(id) {
  if (!confirm('Delete expense?')) return;
  try { await apiDelete('/api/expenses/'+id); await fetchAll(); applyFilter(); showToast('Deleted ✓','success'); }
  catch(err) { showToast('Error: '+err.message,'error'); }
}

function editExpense(id) {
  const e = expenses.find(x=>x._id===id); if(!e) return;
  document.getElementById('expenseId').value = e._id;
  document.getElementById('expenseCow').value = e.cowId||'';
  document.getElementById('expenseDate').value = e.date;
  document.getElementById('expenseType').value = e.type;
  document.getElementById('expenseAmount').value = e.amount;
  document.getElementById('expenseNote').value = e.note||'';
  window.scrollTo({top:0,behavior:'smooth'});
  showToast(`Editing expense for ${cowName(e.cowId)}`,'info');
}

/* ── Rate ── */
async function fetchRate() {
  try { const r=await apiGet('/api/rates/1'); document.getElementById('milkRateInput').value=r?.value||130; milkRate=r?.value||130; }
  catch{}
}

async function saveRate(e) {
  e.preventDefault();
  const value = parseFloat(document.getElementById('milkRateInput').value);
  const res = await apiPut('/api/rates/1', { value });
  if (res?.ok) { milkRate=value; showToast('Rate saved ✓','success'); loadRateHistory(); }
  else showToast('Failed to save rate','error');
}

async function loadRateHistory() {
  try {
    const hist = await apiGet('/api/rates/history');
    const el = document.getElementById('rateHistory');
    if (!hist?.length) { el.textContent = 'No rate change history'; return; }
    el.innerHTML = '<strong>Rate History:</strong> ' + hist.slice(0,5).map(h=>`Rs ${h.value} on ${formatDate(h.date)}`).join(' → ');
  } catch{}
}

/* ── Buyers ── */
async function loadBuyers() {
  try { buyers = await apiGet('/api/buyers'); renderBuyerList(); populateSelects(); }
  catch{}
}

async function saveBuyer(e) {
  e.preventDefault();
  const id = document.getElementById('buyerId').value;
  const payload = {
    name: document.getElementById('buyerName').value,
    phone: document.getElementById('buyerPhone').value,
    address: document.getElementById('buyerAddress').value,
    defaultRate: Number(document.getElementById('buyerRate').value||0),
    notes: document.getElementById('buyerNotes').value
  };
  try {
    let res;
    if (id) res = await apiPut('/api/buyers/'+id, payload);
    else res = await apiPost('/api/buyers', payload);
    if (!res?.ok) { showToast('Error saving buyer','error'); return; }
    await loadBuyers();
    document.getElementById('buyerForm').reset(); document.getElementById('buyerId').value='';
    showToast('Buyer saved ✓','success');
  } catch(err) { showToast('Error: '+err.message,'error'); }
}

async function deleteBuyer(id) {
  if (!confirm('Delete buyer?')) return;
  try { await apiDelete('/api/buyers/'+id); await loadBuyers(); showToast('Deleted ✓','success'); }
  catch(err) { showToast('Error','error'); }
}

function renderBuyerList() {
  const el = document.getElementById('buyerList');
  if (!buyers.length) { el.innerHTML='<div class="small muted">No buyers added yet</div>'; return; }
  el.innerHTML = buyers.map(b=>`<div class="small" style="padding:6px 0;border-bottom:1px solid rgba(0,0,0,.05)">
    <strong>${escapeHtml(b.name)}</strong> ${b.phone?'· '+escapeHtml(b.phone):''} ${b.defaultRate?'· Rs '+b.defaultRate+'/L':''}
    <button class="btn ghost" style="padding:3px 8px;font-size:12px" onclick="deleteBuyer('${b._id}')">Delete</button>
  </div>`).join('');
}

/* ── Populate selects ── */
function populateSelects() {
  const opts = cows.map(c=>`<option value="${c._id}">${escapeHtml(c.name)}</option>`).join('');
  document.getElementById('milkCow').innerHTML = '<option value="">--select--</option>' + opts;
  document.getElementById('expenseCow').innerHTML = '<option value="">--select--</option>' + opts;
  document.getElementById('bulkCowList').innerHTML = cows.map(c=>`
    <label class="checkbox-item"><input type="checkbox" value="${c._id}"/> ${escapeHtml(c.name)}</label>
  `).join('');
  const buyerOpts = buyers.map(b=>`<option value="${b._id}">${escapeHtml(b.name)}</option>`).join('');
  document.getElementById('milkBuyer').innerHTML = '<option value="">--none--</option>' + buyerOpts;
}

function showLast3() {
  const cowId = document.getElementById('milkCow').value;
  const el = document.getElementById('last3');
  if (!cowId) { el.textContent='-'; return; }
  const arr = milk.filter(m=>m.cowId===cowId).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
  el.textContent = arr.map(x=>`${x.date}: ${x.morning||0}↑/${x.evening||0}↓`).join(' | ')||'-';
}

function autoFill() {
  const cowId = document.getElementById('milkCow').value;
  if (!cowId) { showToast('Select a cow first','error'); return; }
  const last = milk.filter(m=>m.cowId===cowId).sort((a,b)=>b.date.localeCompare(a.date))[0];
  if (!last) { showToast('No previous entries','error'); return; }
  document.getElementById('milkMorning').value = last.morning||0;
  document.getElementById('milkEvening').value = last.evening||0;
  showToast('Auto-filled from last entry','info');
}

function showLastExpHint() {
  const store = JSON.parse(localStorage.getItem('dm_last_exp')||'null');
  document.getElementById('lastExpense').textContent = store ? `${store.type} · Rs ${store.amount}` : '-';
}

/* ── Filter & Lists ── */
function applyFilter() {
  const start = document.getElementById('filterStartDate').value;
  const end   = document.getElementById('filterEndDate').value;
  filteredMilk     = filterByDate(milk, start, end, 50);
  filteredExpenses  = filterByDate(expenses, start, end, 50);
  renderLists();
}

function filterByDate(data, start, end, limit=50) {
  let arr = [...data].sort((a,b)=>b.date.localeCompare(a.date));
  if (start && end) arr = arr.filter(x=>x.date>=start && x.date<=end);
  else arr = arr.slice(0, limit);
  return arr;
}

function renderLists() {
  const root = document.getElementById('adminLists');
  const cowsHtml = cows.map(c=>`<div class="list-row">
    <span><strong>${escapeHtml(c.name)}</strong> <span class="small">${escapeHtml(c.breed)} · ${c.weight||'-'}kg · <span class="status-badge status-${c.status}">${c.status}</span></span></span>
    <span>
      <button class="btn ghost sm" onclick="editCow('${c._id}')">Edit</button>
      <button class="btn ghost sm danger" onclick="deleteCow('${c._id}')">Delete</button>
    </span>
  </div>`).join('');

  const milkHtml = filteredMilk.map(m=>`<div class="list-row">
    <span class="small">${formatDate(m.date)} · <strong>${cowName(m.cowId)}</strong> · ${m.morning||0}↑ ${m.evening||0}↓ L ${m.fatPercent?'· Fat:'+m.fatPercent+'%':''}</span>
    <span>
      <button class="btn ghost sm" onclick="editMilk('${m._id}')">Edit</button>
      <button class="btn ghost sm danger" onclick="deleteMilk('${m._id}')">Delete</button>
    </span>
  </div>`).join('');

  const expHtml = filteredExpenses.map(e=>`<div class="list-row">
    <span class="small">${formatDate(e.date)} · <strong>${cowName(e.cowId)}</strong> · ${e.type} · Rs ${e.amount} ${e.note?'· '+escapeHtml(e.note):''}</span>
    <span>
      <button class="btn ghost sm" onclick="editExpense('${e._id}')">Edit</button>
      <button class="btn ghost sm danger" onclick="deleteExpense('${e._id}')">Delete</button>
    </span>
  </div>`).join('');

  root.innerHTML = `
    <h4>Cows (${cows.length})</h4>${cowsHtml||'<div class="small muted">None</div>'}
    <h4 style="margin-top:20px">Milk Entries (${filteredMilk.length})</h4>${milkHtml||'<div class="small muted">None</div>'}
    <h4 style="margin-top:20px">Expenses (${filteredExpenses.length})</h4>${expHtml||'<div class="small muted">None</div>'}
  `;
}

/* ── PDF Reports ── */
function milkReportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const start = document.getElementById('filterStartDate').value;
  const end   = document.getElementById('filterEndDate').value;
  const data  = filterByDate(milk, start, end, 0);
  if (!data.length) { showToast('No milk data for this range','error'); return; }
  doc.setFontSize(18); doc.setTextColor(8,145,178);
  doc.text('Usman Dairy Farm', 14, 20);
  doc.setFontSize(12); doc.setTextColor(0);
  doc.text('Milk Production Report', 14, 28);
  doc.setFontSize(10); doc.setTextColor(100);
  doc.text(`Period: ${start||'All'} to ${end||'All'} | Generated: ${todayISO()}`, 14, 35);
  doc.autoTable({
    startY: 42,
    head:[['Date','Cow','Morning(L)','Evening(L)','Total(L)','Fat%','Buyer']],
    body: data.map(m=>[
      formatDate(m.date), cowName(m.cowId),
      m.morning||0, m.evening||0,
      ((+m.morning||0)+(+m.evening||0)).toFixed(1),
      m.fatPercent||'-',
      buyers.find(b=>b._id===m.buyerId)?.name||'-'
    ]),
    styles:{fontSize:9}, headStyles:{fillColor:[8,145,178]},
    alternateRowStyles:{fillColor:[240,248,255]}
  });
  const total = data.reduce((s,m)=>(+m.morning||0)+(+m.evening||0)+s,0);
  doc.text(`Total: ${total.toFixed(1)} L | Revenue: Rs ${(total*milkRate).toFixed(0)}`, 14, doc.lastAutoTable.finalY+10);
  doc.save('usman-dairy-milk-report.pdf');
}

function expenseReportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const start = document.getElementById('filterStartDate').value;
  const end   = document.getElementById('filterEndDate').value;
  const data  = filterByDate(expenses, start, end, 0);
  if (!data.length) { showToast('No expense data','error'); return; }
  doc.setFontSize(18); doc.setTextColor(8,145,178);
  doc.text('Usman Dairy Farm', 14, 20);
  doc.setFontSize(12); doc.setTextColor(0);
  doc.text('Expense Report', 14, 28);
  doc.setFontSize(10); doc.setTextColor(100);
  doc.text(`Period: ${start||'All'} to ${end||'All'} | Generated: ${todayISO()}`, 14, 35);
  doc.autoTable({
    startY: 42,
    head:[['Date','Cow','Type','Amount (Rs)','Note']],
    body: data.map(e=>[formatDate(e.date), cowName(e.cowId), e.type, e.amount, e.note||'-']),
    styles:{fontSize:9}, headStyles:{fillColor:[239,68,68]},
    alternateRowStyles:{fillColor:[255,245,245]}
  });
  const total = data.reduce((s,e)=>s+(+e.amount||0),0);
  doc.text(`Total Expenses: Rs ${total.toLocaleString()}`, 14, doc.lastAutoTable.finalY+10);
  doc.save('usman-dairy-expense-report.pdf');
}

function monthlyReportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const today = todayISO();
  const months = {};
  milk.forEach(m=>{ const k=m.date.slice(0,7); if(!months[k])months[k]={rev:0,exp:0,litres:0}; const l=(+m.morning||0)+(+m.evening||0); months[k].litres+=l; months[k].rev+=l*milkRate; });
  expenses.forEach(e=>{ const k=e.date.slice(0,7); if(!months[k])months[k]={rev:0,exp:0,litres:0}; months[k].exp+=+e.amount||0; });
  const keys = Object.keys(months).sort().slice(-12);
  doc.setFontSize(20); doc.setTextColor(8,145,178);
  doc.text('Usman Dairy Farm', 14, 22);
  doc.setFontSize(13); doc.setTextColor(0);
  doc.text('Monthly P&L Summary', 14, 31);
  doc.setFontSize(10); doc.setTextColor(100);
  doc.text(`Generated: ${today}`, 14, 38);
  doc.autoTable({
    startY: 45,
    head:[['Month','Litres','Revenue (Rs)','Expenses (Rs)','Profit/Loss (Rs)']],
    body: keys.map(k=>{
      const d=months[k]; const profit=d.rev-d.exp;
      return [k, d.litres.toFixed(1), d.rev.toFixed(0), d.exp.toFixed(0),
        (profit>=0?'+':'')+profit.toFixed(0)];
    }),
    styles:{fontSize:9}, headStyles:{fillColor:[8,145,178]},
    alternateRowStyles:{fillColor:[240,248,255]},
    didParseCell: (data) => {
      if (data.column.index===4 && data.section==='body') {
        const val = parseFloat(data.cell.text[0]);
        data.cell.styles.textColor = val>=0?[16,185,129]:[239,68,68];
      }
    }
  });
  doc.save('usman-dairy-monthly-summary.pdf');
}

/* ── Excel Exports ── */
function exportMilkExcel() {
  const start = document.getElementById('filterStartDate').value;
  const end   = document.getElementById('filterEndDate').value;
  const data  = filterByDate(milk, start, end, 0);
  if (!data.length) { showToast('No data','error'); return; }
  const rows = data.map(m=>({
    Date: formatDate(m.date), Cow: cowName(m.cowId),
    Morning_L: m.morning||0, Evening_L: m.evening||0,
    Total_L: (+m.morning||0)+(+m.evening||0),
    Fat_Pct: m.fatPercent||'', SNF_Pct: m.snfPercent||'',
    Revenue_Rs: ((+m.morning||0)+(+m.evening||0))*milkRate,
    Buyer: buyers.find(b=>b._id===m.buyerId)?.name||''
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Milk');
  XLSX.writeFile(wb, 'usman-dairy-milk.xlsx');
  showToast('Excel downloaded ✓','success');
}

function exportExpenseExcel() {
  const start = document.getElementById('filterStartDate').value;
  const end   = document.getElementById('filterEndDate').value;
  const data  = filterByDate(expenses, start, end, 0);
  if (!data.length) { showToast('No data','error'); return; }
  const rows = data.map(e=>({ Date:formatDate(e.date), Cow:cowName(e.cowId), Type:e.type, Amount_Rs:e.amount, Note:e.note||'' }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Expenses');
  XLSX.writeFile(wb, 'usman-dairy-expenses.xlsx');
  showToast('Excel downloaded ✓','success');
}

/* ── Backup ── */
async function downloadBackup() {
  try {
    const token = localStorage.getItem('dm_token');
    const res = await fetch(API+'/api/backup', { headers:{ Authorization:'Bearer '+token } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `usman-dairy-backup-${todayISO()}.json`;
    a.click();
    showToast('Backup downloaded ✓','success');
  } catch(err) { showToast('Backup failed','error'); }
}

async function restoreBackup(input) {
  const file = input.files[0]; if(!file) return;
  if (!confirm('This will REPLACE all data. Are you sure?')) { input.value=''; return; }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    document.getElementById('backupStatus').textContent = 'Restoring...';
    const token = localStorage.getItem('dm_token');
    const res = await fetch(API+'/api/backup/restore', {
      method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      document.getElementById('backupStatus').textContent = '✅ Restore complete!';
      showToast('Data restored ✓','success');
      await fetchAll(); populateSelects(); applyFilter();
    } else {
      document.getElementById('backupStatus').textContent = '❌ Restore failed';
      showToast('Restore failed','error');
    }
  } catch(err) {
    document.getElementById('backupStatus').textContent = '❌ Invalid backup file';
    showToast('Invalid file','error');
  }
  input.value='';
}

/* ── Helpers ── */
function cowName(id) { const c=cows.find(x=>x._id===id); return c?c.name:id||'-'; }
