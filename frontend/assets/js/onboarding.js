import { setupAuth, onAuthStateChanged, signOut } from './auth-client.js';
const $ = id => document.getElementById(id);
let currentUser, auth;
$('submit').disabled = true;
try {
  auth = await setupAuth();
  $('logout').onclick = () => signOut(auth);
  onAuthStateChanged(auth, async user => { if (!user) { location.replace('/'); return; } currentUser = user; try { const response = await fetch('/api/v1/me', {headers:{Authorization:`Bearer ${await user.getIdToken()}`}}); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load account'); $('back-link').hidden = !data.businesses.length; $('submit').disabled = false; } catch(error) { $('message').textContent = error.message; } });
  $('business-form').onsubmit = async event => {
    event.preventDefault(); $('message').textContent = ''; $('submit').disabled = true;
    try {
      const response = await fetch('/api/v1/businesses', {method:'POST', headers:{'Authorization':`Bearer ${await currentUser.getIdToken()}`,'Content-Type':'application/json'},body:JSON.stringify({name:$('name').value.trim(),currency:$('currency').value,timezone:$('timezone').value})});
      const data = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
      if (!response.ok) throw new Error(data?.error || `Server error (${response.status})`);
      sessionStorage.setItem('urus-business-id',String(data.id));
      location.replace('/dashboard.html');
    } catch(error) { $('message').textContent = error.message; $('submit').disabled = false; }
  };
} catch(error) { $('message').textContent = error.message; }
