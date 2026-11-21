"""Prepare only public assets for Firebase Hosting; no backend or secrets."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[1]
frontend = root / 'frontend'
destination = root / '.firebase-public'
destination.mkdir(exist_ok=True)
pages = ('index.html', 'dashboard.html', 'inventory.html', 'orders.html',
         'reports.html', 'onboarding.html', 'settings.html',
         'suppliers.html', 'movements.html')
allowed = {Path(name) for name in pages}
allowed.update(Path('assets') / p.relative_to(frontend / 'assets')
               for p in (frontend / 'assets').rglob('*') if p.is_file())
unexpected = [p for p in destination.rglob('*')
              if p.is_symlink() or (p.is_file() and p.relative_to(destination) not in allowed)]
if unexpected:
    raise SystemExit('Unexpected files in public directory; inspect and remove them before publishing.')
if any(p.is_symlink() for p in (frontend / 'assets').rglob('*')):
    raise SystemExit('Symbolic links in assets are not allowed.')
for name in pages:
    shutil.copy2(frontend / name, destination / name)
shutil.copytree(frontend / 'assets', destination / 'assets', dirs_exist_ok=True)
