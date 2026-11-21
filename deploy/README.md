# URUS operations

The systemd service and daily backup timer are defined in this directory. The
application loads `/root/projects/urus/.env`; this file must remain private.
The backup timer runs around 02:00 UTC and uses PostgreSQL's custom dump format.
Backups are written to `/root/projects/urus/.backups` with owner-only access.
They are not automatically deleted. Monitor disk space and copy encrypted
backups to separate storage: local copies alone do not survive server loss.

Check service and backup status:

```
systemctl status urus.service
systemctl list-timers urus-backup.timer
journalctl -u urus-backup.service
```

Create a backup on demand with `systemctl start urus-backup.service`. To verify
one, run `bash deploy/check-restore.sh /absolute/path/to/backup.dump` as the
local PostgreSQL role with permission to create databases. The script restores
into a uniquely named temporary database and removes it on exit; it does not
modify the live database. A successful restore check does not replace regular
application-level recovery exercises.

The application currently listens on port 5000 over HTTP. Configure a dedicated
HTTPS domain and reverse proxy, then restrict Gunicorn to localhost; do not
place the HTTP endpoint behind a proxy while leaving port 5000 publicly open.

## Firebase and Cloud Run migration

The Firebase Hosting site is `https://urus-ba98e.web.app`. Its `/api/**`
requests are routed to Cloud Run `urus-api` in `asia-southeast1`. The service
connects via the Cloud SQL socket to database `urus` on instance `urus-db`;
`DATABASE_URL` is stored in Secret Manager as `urus-db-url`. Cloud SQL daily
backups are enabled and retain seven backups; instance deletion protection is
on. The former local `urus_dev` database and its final backup are retained for
rollback only. The local application service and its backup timer are disabled
to avoid writes to the old copy and misleading backups.

Rebuild public static files with `python3 deploy/build-firebase-public.py` before
any Hosting deployment. Deploying code or altering cloud infrastructure requires
appropriate Google Cloud credentials. A test copy `urus_staging` remains for
migration verification and can be removed after successful user acceptance.
Do not restart the old service against the old database after cloud cutover:
it would create a second, divergent dataset.
