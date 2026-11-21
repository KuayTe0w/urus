import { setupAuth, onAuthStateChanged, signOut } from './auth-client.js';
const $ = id => document.getElementById(id);
let currentUser, auth, businesses = [], selected;
$('submit').disabled = true;
function showBusiness() {
  selected = businesses.find(b => String(b.id) === $('business').value);
  if (!selected) return;
  sessionStorage.setItem('urus-business-id', String(selected.id));
  $('name').value = selected.name; $('currency').value = selected.currency; $('timezone').value = selected.timezone;
  $('submit').disabled = selected.role !== 'owner';
  $('message').textContent = selected.role === 'owner' ? '' : 'Only the owner can change business settings.';
}
$('business').onchange = showBusiness;
try {
  auth = await setupAuth(); $('logout').onclick = () => signOut(auth);
  onAuthStateChanged(auth, async user => {
    if (!user) { sessionStorage.removeItem('urus-business-id'); location.replace('/'); return; }
    currentUser = user;
    try {
      const response = await fetch('/api/v1/me', {headers:{Authorization:`Bearer ${await user.getIdToken()}`}});
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load account');
      businesses = data.businesses; if (!businesses.length) { location.replace('/onboarding.html'); return; }
      $('business').replaceChildren(...businesses.map(b => { const o = document.createElement('option'); o.value = b.id; o.textContent = b.name; return o; }));
      const saved = sessionStorage.getItem('urus-business-id'); $('business').value = businesses.some(b => String(b.id) === saved) ? saved : String(businesses[0].id); showBusiness();
    } catch (error) { $('message').textContent = error.message; }
  });
  $('business-form').onsubmit = async event => {
    event.preventDefault();
    if ($('currency').value !== selected.currency && !confirm('Changing currency does not convert existing prices. Continue?')) return;
    $('submit').disabled = true; $('message').textContent = '';
    try {
      const response = await fetch(`/api/v1/businesses/${selected.id}`, {method:'PATCH', headers:{Authorization:`Bearer ${await currentUser.getIdToken()}`,'Content-Type':'application/json'}, body:JSON.stringify({name:$('name').value.trim(),currency:$('currency').value,timezone:$('timezone').value})});
      const data = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
      if (!response.ok) throw new Error(data?.error || `Server error (${response.status})`);
      Object.assign(selected,data); $('business').selectedOptions[0].textContent = data.name; $('message').textContent = 'Settings saved.';
    } catch(error) { $('message').textContent = error.message; } finally { $('submit').disabled = false; }
  };
} catch(error) { $('message').textContent = error.message; }
