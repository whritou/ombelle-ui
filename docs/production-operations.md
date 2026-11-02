# Production operations

Runbook for the hosted service at `https://ombelle-ui.vercel.app` (Vercel project `ombelle-ui`, Neon project `neon-carmine-cable`, production branch `main`, endpoint `ep-bitter-meadow-b9plx52i`). See [snapshot service operations](snapshot-service-operations.md) for the service contract and [hosted deployment](hosted-deployment.md) for deployment.

Backup and restore commands run on Linux or WSL with `bash`, `curl`, `python3` and `dpkg-deb`. They download a pinned PostgreSQL 18.6 client from apt.postgresql.org into `~/.cache/ombelle-pg18`, check its SHA-256 and need no root access. Connection URLs are passed through environment variables and never appear in command arguments.

## Monitoring

`.github/workflows/monitor-production.yml` runs `scripts/monitor-production.sh` every hour at minute 17 and on demand (Actions → Monitor production → Run workflow). A failed run is a failed scheduled workflow, which GitHub reports by email to the account that last changed the schedule; keep "Actions" notifications for failed workflows enabled in your GitHub notification settings.

Each run checks:

- the home, privacy and security pages, an editor preview and the compiler worker return 200;
- an unknown preset code returns `SNAPSHOT_NOT_FOUND`, which proves the API reaches an initialized database (a 503 means missing configuration or schema);
- `/.well-known/security.txt` expires in more than 30 days;
- with `MONITOR_DATABASE_URL` set: stored publications (limit 100,000), stored response bytes (256 MiB), publications today in UTC (global limit 1,000) and database size (Neon Free 1 GiB), each failing at 80%.

### Read-only monitoring role

Create the role once on the production branch. Generate a password locally, for example in WSL with `openssl rand -hex 24`, and keep it out of chat and shell history. In the Neon console, select branch `main`, open the SQL Editor on database `neondb` and run, with your password:

```sql
CREATE ROLE ombelle_monitor WITH LOGIN PASSWORD 'GENERATED_PASSWORD';
GRANT CONNECT ON DATABASE neondb TO ombelle_monitor;
GRANT USAGE ON SCHEMA ombelle TO ombelle_monitor;
GRANT SELECT ON ombelle.capacity, ombelle.rate_buckets TO ombelle_monitor;
ALTER ROLE ombelle_monitor SET default_transaction_read_only = on;
```

A role created through SQL is not a member of `neon_superuser`, unlike roles created in the console's Roles page, so it can only read those two tables. Then add the repository secret `MONITOR_DATABASE_URL` (Settings → Secrets and variables → Actions) with:

```
postgresql://ombelle_monitor:GENERATED_PASSWORD@ep-bitter-meadow-b9plx52i-pooler.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Run the workflow manually once and confirm the four quota lines appear. Without the secret, quota checks are skipped with a warning.

## Backups

Neon Free also provides, inside the same Neon project:

- restore of a branch to any point in the last 6 hours (Backup & Restore, "Restore from history");
- manual snapshots that restore instantly.

Scheduled snapshots need a paid Neon plan. These protect against recent mistakes but are not an independent copy, so they complement the `pg_dump` backups below rather than replace them.

### Automated monthly backup

`.github/workflows/backup-production.yml` runs on the 1st of each month at 03:23 UTC and on demand (Actions → Back up production → Run workflow). It installs the PostgreSQL 18 client from apt.postgresql.org, runs `scripts/backup-production.sh` with the `BACKUP_DATABASE_URL` secret, encrypts the dump with [age](https://age-encryption.org) for the public keys in `.github/backup-recipients.txt`, deletes the plaintext and uploads an artifact `ombelle-backup-<run id>` kept for 90 days. The artifact holds `ombelle-<stamp>.dump.age`, the `.summary` (row counts and fingerprint) and the `.sha256` of the plaintext dump. The repository is public and signed-in GitHub users can download artifacts, which is why only the encrypted dump leaves the runner. The monitor fails when no backup run has succeeded in the last 35 days.

Keep a copy of at least one backup per quarter outside GitHub, because artifacts expire after 90 days. Back up manually as well before any schema migration and before rotating database secrets.

**Encryption key.** Generate the key pair once on your machine, in WSL (install with `sudo apt install age` if needed):

```bash
age-keygen -o ~/.config/ombelle/backup-key.txt
```

The command prints the public key (`age1…`); it goes in `.github/backup-recipients.txt`, one key per line. The file `backup-key.txt` holds the private key: keep it out of the repository and keep an offline copy, for example in a password manager. Without it, the encrypted backups cannot be read.

**Backup role.** Create a read-only role on branch `main` (Neon SQL Editor, database `neondb`), with a password generated locally (`openssl rand -hex 24`):

```sql
CREATE ROLE ombelle_backup WITH LOGIN PASSWORD 'GENERATED_PASSWORD';
GRANT CONNECT ON DATABASE neondb TO ombelle_backup;
GRANT USAGE ON SCHEMA ombelle TO ombelle_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA ombelle TO ombelle_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA ombelle GRANT SELECT ON TABLES TO ombelle_backup;
ALTER ROLE ombelle_backup SET default_transaction_read_only = on;
```

Store the **direct** URL (no `-pooler`; `pg_dump` needs a session connection) as the repository secret `BACKUP_DATABASE_URL`:

```
postgresql://ombelle_backup:GENERATED_PASSWORD@ep-bitter-meadow-b9plx52i.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

**Restoring an automated backup.** Download and decrypt it, then use the restore drill below:

```bash
gh run download RUN_ID -R whritou/ombelle-ui -n ombelle-backup-RUN_ID -D /absolute/path/to/backups
cd /absolute/path/to/backups
age --decrypt -i ~/.config/ombelle/backup-key.txt -o ombelle-STAMP.dump ombelle-STAMP.dump.age
```

### Manual backup

Take the direct (unpooled) URL of branch `main` from the Neon console (Connect, connection pooling off; the host has no `-pooler`), then from the repository root in WSL:

```bash
read -rs OMBELLE_BACKUP_DATABASE_URL && export OMBELLE_BACKUP_DATABASE_URL
bash scripts/backup-production.sh /absolute/path/to/backups
```

Type the `read` line alone, then paste the URL at the blank prompt so it stays out of shell history. Keep manual backups on private storage; never commit them or upload them unencrypted.

The script writes `ombelle-<UTC stamp>.dump` (custom format, `ombelle` schema only, no owner or privileges), a `.summary` with row counts and a publications fingerprint, and a `.sha256`. It refuses pooled hosts and never overwrites files. Backups contain everything in the `ombelle` schema, including withdrawn publications, retry keys and HMAC rate keys.

## Restore drill

Run after the first backup and then at least quarterly. It proves the latest backup restores, without touching production.

1. In the Neon console, create a branch named `restore-drill-<date>` from `main`.
2. On that branch, create an empty database `restore_drill` owned by `neondb_owner`.
3. Copy the direct URL for `restore_drill` on that branch (its endpoint differs from production).
4. From the repository root in WSL:

   ```bash
   OMBELLE_DRILL_DATABASE_URL='postgresql://…/restore_drill?sslmode=require' bash scripts/restore-drill.sh /absolute/path/to/backups/ombelle-<stamp>.dump
   ```

   The script checks the backup's SHA-256, refuses the production host and any database that already contains an `ombelle` schema, restores in one transaction and compares row counts and the publications fingerprint with the summary.
5. Record the date, backup stamp and result below, then delete the drill branch in the Neon console.

A mismatch caused by a publication made between the summary and the dump only means the backup should be retaken.

| Date | Backup | Result |
| --- | --- | --- |
| 2026-11-02 | `ombelle-20261102T205920Z` (13,404 bytes; 3 publications, 0 withdrawals, fingerprint `f22ee39b…dcbb2659`) | passed on branch `restore-drill-20261102` (`ep-calm-thunder-b9jk3k8m`), database `restore_drill` |

## Contacts and policy pages

Support goes through GitHub issues and vulnerability reports through GitHub private vulnerability reporting, which is enabled on the repository. The site publishes `/privacy`, `/security` and `/.well-known/security.txt`. Renew the `Expires` date in `apps/www/public/.well-known/security.txt` before it comes within 30 days; the monitor fails otherwise. Withdraw a reported publication with `snapshots:withdraw` (see the snapshot service operations).
