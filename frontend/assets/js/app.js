const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
menuBtn?.addEventListener('click', () => sidebar?.classList.toggle('active'));
document.querySelector('.settings-btn')?.addEventListener('click', () => { location.href = '/settings.html'; });
const container = document.querySelector('.container');
const handle = document.querySelector('.resize-handle');
let resizing = false;
handle?.addEventListener('mousedown', () => { resizing = true; });
document.addEventListener('mousemove', event => {
  if (!resizing) return;
  const width = window.innerWidth - event.clientX;
  if (width >= 250 && width <= 700) container.style.gridTemplateColumns = `1fr 6px ${width}px`;
});
document.addEventListener('mouseup', () => { resizing = false; });
handle?.addEventListener('dblclick', () => { container.style.gridTemplateColumns = '1fr 5px 300px'; });
