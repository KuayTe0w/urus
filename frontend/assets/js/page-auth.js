import { setupAuth, onAuthStateChanged, signOut } from './auth-client.js';
try {
  const auth = await setupAuth();
  document.querySelector('.logout-btn')?.addEventListener('click', () => signOut(auth));
  onAuthStateChanged(auth, async user => {
    if (!user) { sessionStorage.removeItem('urus-business-id'); location.replace('/'); return; }
    try {
      const response = await fetch('/api/v1/me', {headers:{Authorization:`Bearer ${await user.getIdToken()}`}});
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load account');
      if (!data.businesses.length) location.replace('/onboarding.html');
      else {
        const selected = data.businesses.find(b => String(b.id) === sessionStorage.getItem('urus-business-id')) || data.businesses[0];
        document.querySelector('.header h1').textContent = selected.name;
      }
    } catch (error) { document.querySelector('main').prepend(document.createTextNode(error.message)); }
  });
} catch (error) { document.querySelector('main').prepend(document.createTextNode(error.message)); }
