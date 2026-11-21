#!/usr/bin/env bash
set -euo pipefail
umask 077
backup_dir=/root/projects/urus/.backups
mkdir -p "$backup_dir"
temp_file=$(mktemp "$backup_dir/.urus-XXXXXXXX.dump")
trap 'rm -f "$temp_file"' EXIT
pg_dump --dbname=urus_dev --format=custom --no-owner --no-acl --file="$temp_file"
pg_restore --list "$temp_file" > /dev/null
backup_file="$backup_dir/urus-$(date -u +%Y%m%dT%H%M%S)-$(basename "$temp_file" .dump | cut -c 7-).dump"
mv "$temp_file" "$backup_file"
trap - EXIT
printf 'Backup created: %s\n' "$backup_file"
