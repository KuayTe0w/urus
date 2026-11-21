import { setupAuth, onAuthStateChanged, signOut } from './auth-client.js';
const $ = id => document.getElementById(id);
let auth, user, business, businesses = [];
function node(tag, value, className) { const el = document.createElement(tag); el.textContent = value; if (className) el.className = className; return el; }
function report(error) { $('message').textContent = error.message || String(error); }
async function api(path) {
  const headers = {Authorization: `Bearer ${await user.getIdToken()}`};
  if (business) headers['X-Business-ID'] = business;
  const response = await fetch('/api/v1' + path, {headers});
  const data = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
  if (!response.ok || !data) throw new Error(data?.error || `Server error (${response.status})`);
  return data;
}
async function refresh() {
  $('message').textContent = '';
  const [summary, activity] = await Promise.all([api('/dashboard/summary'), api('/dashboard/activity')]);
  const active = businesses.find(item => String(item.id) === business);
  $('business-name').textContent = active.name;
  $('total-products').textContent = summary.total_products;
  $('low-stock').textContent = summary.low_stock;
  $('inventory-value').textContent = `${active.currency} ${summary.inventory_value}`;
  $('alert-count').textContent = Number(summary.out_of_stock > 0) + Number(summary.low_stock > 0);
  $('out-stock-alert').textContent = `${summary.out_of_stock} products out of stock`;
  $('low-stock-alert').textContent = `${summary.low_stock} items at or below threshold`;
  const list = $('activity');
  if (!activity.length) { list.replaceChildren(node('p', 'No stock activity yet.')); return; }
  list.replaceChildren(...activity.map(item => {
    const row = node('div', '', 'history-item');
    const type = node('span', 'UPDATE', 'history-type stock');
    const details = node('div', '');
    details.append(node('strong', item.name), node('p', `${item.quantity_delta} · ${item.reason}`));
    const date = node('span', new Date(item.created_at).toLocaleString(undefined, {timeZone: active.timezone}), 'history-time');
    row.append(type, details, date);
    return row;
  }));
}
$('business').onchange = event => { business = event.target.value; sessionStorage.setItem('urus-business-id', business); refresh().catch(report); };
document.querySelector('.logout-btn').onclick = () => signOut(auth);
try {
  auth = await setupAuth();
  onAuthStateChanged(auth, async current => {
    if (!current) { location.replace('/'); return; }
    user = current;
    try {
      const me = await api('/me'); businesses = me.businesses;
      if (!businesses.length) { location.replace('/onboarding.html'); return; }
      $('business').replaceChildren(...businesses.map(item => { const option = node('option', item.name); option.value = item.id; return option; }));
      $('business').hidden = businesses.length < 2;
      const saved = sessionStorage.getItem('urus-business-id');
      business = businesses.some(item => String(item.id) === saved) ? saved : String(businesses[0].id);
      $('business').value = business;
      sessionStorage.setItem('urus-business-id', business);
      await refresh();
    } catch (error) { report(error); }
  });
} catch (error) { report(error); }
