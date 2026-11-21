"""Build a Firebase preview configured exclusively for the staging project."""
import json
import os
from pathlib import Path
import shutil
import subprocess

root = Path(__file__).resolve().parents[1]
project = os.environ.get('URUS_STAGING_PROJECT_ID', '').strip()
if not project:
    raise SystemExit('URUS_STAGING_PROJECT_ID is required.')
subprocess.run(['python3', str(root / 'deploy/build-firebase-public.py')], check=True)
dest = root / '.preview-hosting'
dest.mkdir(exist_ok=True)
shutil.copytree(root / '.firebase-public', dest / 'public', dirs_exist_ok=True)
config = {'hosting': {'public': 'public', 'ignore': ['firebase.json', '**/.*', '**/node_modules/**'],
                      'rewrites': [{'source': '/api/**', 'run': {'serviceId': 'urus-api-staging', 'region': 'asia-southeast1'}}]}}
(dest / 'firebase.json').write_text(json.dumps(config, indent=2) + '\n')
