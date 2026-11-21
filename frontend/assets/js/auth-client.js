import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
export async function setupAuth() {
  const response = await fetch('/api/config');
  const config = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
  if (!response.ok || !config) throw new Error(config?.error || `Authentication service unavailable (${response.status}). Please try again.`);
  return getAuth(initializeApp(config));
}
export { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut };
