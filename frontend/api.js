/* api.js — central API helper for all frontend pages */
const API = 'https://dairy-farm-manager-v2-production.up.railway.app';

function getToken() { return localStorage.getItem('dm_token'); }
function getRole()  { return localStorage.getItem('dm_role'); }

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {})
    }
  });
  if (res.status === 401) {
    localStorage.removeItem('dm_token');
    window.location.href = 'login.html';
    return;
  }
  return res;
}

async function apiGet(path) {
  const res = await apiFetch(path);
  if (!res?.ok) throw new Error(await res?.text());
  return res.json();
}

async function apiPost(path, data) {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(data) });
  return res;
}

async function apiPut(path, data) {
  const res = await apiFetch(path, { method: 'PUT', body: JSON.stringify(data) });
  return res;
}

async function apiDelete(path) {
  const res = await apiFetch(path, { method: 'DELETE' });
  return res;
}

function requireAuth() {
  if (!getToken()) window.location.href = 'login.html';
}

function requireAdmin() {
  if (!getToken()) { window.location.href = 'login.html'; return; }
  if (getRole() !== 'admin') {
    alert('Admin access required');
    window.location.href = 'index.html';
  }
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe ?? '';
  return unsafe.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
               .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' });
}

function todayISO() { return new Date().toISOString().slice(0,10); }
