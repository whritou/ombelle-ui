# Production operations

Runbook for the hosted service at `https://ombelle-ui.vercel.app` (Vercel project `ombelle-ui`, Neon project `<neon-project>`, production branch `main`, endpoint `<production-endpoint>`). See [snapshot service operations](snapshot-service-operations.md) for the service contract and [hosted deployment](hosted-deployment.md) for deployment.

Backup and restore commands run on Linux or WSL with `bash`, `curl`, `python3` and `dpkg-deb`. They download a pinned PostgreSQL 18.6 client from apt.postgresql.org into `~/.cache/ombelle-pg18`, check its SHA-256 and need no root access. Connection URLs are passed through environment variables and never appear in command arguments.

## Monitoring

`.github/workflows/monitor-production.yml` asks GitHub to run `scripts/monitor-production.sh` every hour at minute 17, and runs on demand (Actions → Monitor production → Run workflow). **GitHub does not deliver that schedule:** between 3 and 22 November 2026 the 70 scheduled runs came 3 to 5 times a day, with gaps up to 10.8 hours (median 7.3), and GitHub disables schedules after 60 days without repository activity. So treat this job as a quota, backup, consistency and published-CLI check, not as an uptime monitor. Availability needs an external probe, and a monitor that silently stops needs a dead-man's switch; both are [owner actions](#owner-actions-nothing-in-the-repository-can-do-these). A failed run is reported by GitHub by email to the account that last changed the schedule (keep "Actions" notifications for failed workflows enabled) and, when `MONITOR_ALERT_WEBHOOK_URL` is set, posted to that webhook; a passing run pings `MONITOR_HEARTBEAT_URL`.

Each run checks:

- the home, privacy and security pages, an editor preview and the compiler worker return 200;
- an unknown preset code returns `SNAPSHOT_NOT_FOUND`, which proves the API reaches an initialized database (a 503 means missing configuration or schema);
- with `MONITOR_KNOWN_CODE` and `MONITOR_KNOWN_ETAG` set (repository variables), an existing published code reads with its recorded ETag, which proves the service's read-time integrity checks still pass (the unknown-code probe only proves the 404 path);
- the installer version the website advertises (`publishedInstaller`) exists on npm, so a site deployed before its CLI is published is caught;
- `/.well-known/security.txt` expires in more than 30 days;
- with `MONITOR_DATABASE_URL` set: stored publications (limit 100,000), stored response bytes (256 MiB), publications today in UTC (global limit 5,000) and database size (against `MONITOR_DB_LIMIT_BYTES`, default 1 GiB; set it from the real Neon plan), each failing at 80%;
- the latest successful backup run is at most three days old.

Not monitored, and why: 5xx rate and latency (Vercel Hobby has no log drain; the Vercel API needs a token the owner would have to create), Vercel and Neon plan usage (dashboard alerts, owner action) and database connection counts. The first request after idle takes 3 to 3.5 seconds (function start plus Neon resuming from scale-to-zero), so a probe must allow about 10 seconds.

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
postgresql://ombelle_monitor:GENERATED_PASSWORD@<production-endpoint>-pooler.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&sslrootcert=system
```

`scripts/monitor-production.sh` also sets `PGSSLMODE=verify-full PGSSLROOTCERT=system`, so the certificate is verified even if the secret still says `sslmode=require`.

Run the workflow manually once and confirm the four quota lines appear. Without the secret, quota checks are skipped with a warning.

## Backups

Neon Free also provides, inside the same Neon project:

- restore of a branch to any point in the last 6 hours (Backup & Restore, "Restore from history");
- manual snapshots that restore instantly.

Scheduled snapshots need a paid Neon plan. These protect against recent mistakes but are not an independent copy, so they complement the `pg_dump` backups below rather than replace them.

### Automated daily backup

`.github/workflows/backup-production.yml` runs every day at 03:23 UTC (best effort, like every GitHub schedule) and on demand (Actions → Back up production → Run workflow). It installs the PostgreSQL 18 client from apt.postgresql.org, runs `scripts/backup-production.sh` with the `BACKUP_DATABASE_URL` secret, encrypts the dump with [age](https://age-encryption.org) for the public keys in `.github/backup-recipients.txt`, deletes the plaintext and uploads an artifact `ombelle-backup-<run id>` kept for 90 days. The artifact holds `ombelle-<stamp>.dump.age`, the `.summary` (row counts and fingerprint) and the `.sha256` of the plaintext dump. The repository is public and signed-in GitHub users can download artifacts, which is why only the encrypted dump leaves the runner. The monitor fails when no backup run has succeeded in the last three days. The recorded dump is about 13 KB, so a daily schedule costs nothing; it narrows the loss window from up to a month to about a day, against Neon's own 6-hour history.

Keep a copy of at least one backup per quarter outside GitHub (an owner action, see above, with a row in the drill table), because artifacts expire after 90 days and all of them sit in one GitHub account. Back up manually as well before any schema migration and before rotating database secrets.

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
postgresql://ombelle_backup:GENERATED_PASSWORD@<production-endpoint>.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

**Restoring an automated backup.** Download and decrypt it, then use the restore drill below. From WSL with the Windows GitHub CLI (`/mnt/c/Program Files/GitHub CLI/gh.exe`), give `-D` a Windows path such as `'D:\ombelle-backups\auto'`: Windows reads a `/mnt/d/…` path as `D:\mnt\d\…`.

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

Add a row each quarter for the off-GitHub copy of an encrypted backup too (stamp, where it is kept, and that it decrypted with the current key), so the copy outside GitHub is a recorded step rather than a memory.

| Date | Backup | Result |
| --- | --- | --- |
| 2026-11-02 | `ombelle-20261102T205920Z` (13,404 bytes; 3 publications, 0 withdrawals, fingerprint `f22ee39b…dcbb2659`) | passed on branch `restore-drill-20261102` (`<drill-endpoint>`), database `restore_drill` |
| 2026-11-02 | `ombelle-20261102T220435Z` from automated run 41534024137 (artifact `ombelle-backup-41534024137`, decrypted with the operator key; fingerprint `f22ee39b…dcbb2659`) | passed on branch `restore-drill-20261102`, database `restore_drill_auto` |

## Preview database branches

The Vercel Neon integration creates a Neon branch `preview/<git branch>` for each git branch that gets a preview deployment and never deletes it. Neon Free allows 10 branches per project; when the limit is reached, preview deployments fail at "Create database branch for deployment".

`.github/workflows/cleanup-neon-preview.yml` runs `scripts/cleanup-neon-preview.sh` on three triggers and deletes through the Neon API, retrying transient errors:

- **A pull request closes** (`pull_request_target: closed`, merged or not): deletes `preview/<head branch>`. It uses `pull_request_target` because a plain `pull_request` run triggered by Dependabot gets no repository secrets, which is how previews leaked before (three Dependabot closes on 2026-11-17 failed with `NEON_API_KEY is not set`). It stays safe because the job checks out only the base branch's script, never the pull request's code, and passes the branch name through the environment.
- **A branch is deleted** (`delete`): the same deletion, for branches that never had a pull request.
- **A daily sweep** (04:41 UTC, or Run workflow with the branch field empty): deletes every `preview/*` Neon branch whose git branch does not exist and has no open pull request, which catches an API timeout (as on 2026-11-09) or any miss. The live list is every git branch plus every open pull request's head branch. Run it once with "Sweep only; list what would be deleted" ticked to see what it would do.

The script refuses names outside `preview/`, default or protected branches and unexpected git branch names, refuses a sweep whose live list is empty or lacks `main`, keeps branches younger than 24 hours, and does nothing when the branch is absent. Run it manually (Actions → Clean up Neon preview branches → Run workflow) with a git branch name to remove a specific leftover. GitHub deletes merged head branches automatically.

It needs the repository secret `NEON_API_KEY`: a project-scoped API key for `<neon-project>`, created in the Neon console under the organization's API keys. Keep `main` and any branch you created by hand out of the `preview/` prefix.

## Who can do what, and what only the owner can do

Today every account, credential and alert sits with one maintainer (OPS-07). This table says where each capability lives, so that a second maintainer can be added by changing it.

| Capability | Held by | Where it lives |
| --- | --- | --- |
| Deploy, roll back, set environment variables | The owner | Vercel Hobby project `ombelle-ui` (a personal account with no team members) |
| Restore, branch, role and API-key changes | The owner | Neon Free project (`<neon-project>`) |
| Publish or deprecate `@ombelle-ui/cli` | The npm identity `ombelle` | The owner's workstation and 2FA device |
| Decrypt backups | The owner | The age private key `~/.config/ombelle/backup-key.txt`, one offline copy |
| Alerts | The owner | GitHub's failed-workflow email, plus the optional webhook and heartbeat below |
| Merge to `main` (which deploys production) | The owner | `.github/CODEOWNERS`, the `verify` ruleset |

### Owner actions (nothing in the repository can do these)

Do them in this order of value:

1. **Add an external uptime probe and a heartbeat.** Create an account with an uptime service (for example Better Stack, UptimeRobot or healthchecks.io) that probes `/`, `/api/v1/presets/ps_00000000000000000000000000000000/1` (expect 404 `SNAPSHOT_NOT_FOUND`) and a known code every 1 to 5 minutes, and notifies at least two people or channels. Create a healthchecks-style check with a 3 hour period and 3 hour grace and save its ping URL as the repository secret `MONITOR_HEARTBEAT_URL`: the monitor pings it on success, and the service alerts when pings stop (GitHub drops or delays scheduled runs, and disables schedules after 60 days without repository activity).
2. **Add a second alert channel.** Save a chat webhook (Slack, Discord, Teams or any endpoint that accepts `{ "text": "…" }`) as the secret `MONITOR_ALERT_WEBHOOK_URL`. Failed monitor runs post there as well as emailing one person.
3. **Record a known code for the read probe.** Pick a published code you control, run `curl -sI https://ombelle-ui.vercel.app/api/v1/presets/<id>/1` once, and save the code and the `ETag` value (with quotes) as repository variables `MONITOR_KNOWN_CODE` and `MONITOR_KNOWN_ETAG`. Update the ETag only if the published bytes legitimately changed, which for an immutable code never happens.
4. **Read the real plan limits.** In the Neon console read the storage allowance and compute hours; set the repository variable `MONITOR_DB_LIMIT_BYTES` to the allowance (the monitor assumes 1 GiB, and Neon has advertised 0.5 GB). In Vercel, read the Hobby usage page and terms: Hobby is described as personal and non-commercial, which matters once 1.0 has commercial users or sponsors. Enable the usage alerts both dashboards offer; they are dashboard settings, not repository files. Both free tiers stop the service rather than bill when a limit is reached, so an exhausted limit is an outage that also stops CLI code resolution.
5. **Add a second maintainer.** Give a trusted person access to Vercel (move the project to a team), Neon (organization member), npm (add them to the `@ombelle-ui` organization) and the GitHub repository's admin settings; add their age public key to `.github/backup-recipients.txt` so they can decrypt backups; list them in `.github/CODEOWNERS`; send alerts to a shared channel. Until then, the single-person risk stands and is recorded as such in the 1.0 release notes.
6. **Take a second, off-GitHub copy of the backups.** The workflow keeps encrypted artifacts for 90 days inside GitHub only. Either download one encrypted backup per quarter to private storage and log it in the drill table below, or add an upload step to the workflow to a second store with object lock (for example an R2 or S3 bucket). The credentials for that store are owner secrets.
7. **Optional: stop building Vercel previews for `dependabot/*`** with the project's Ignored Build Step; CI already covers them. This also lowers the Neon branch pressure.
8. **Optional: Neon's own preview-branch cleanup.** Some versions of the Neon-Vercel integration offer automatic deletion of obsolete preview branches; check whether this project's integration has it. The sweep below does not depend on it.
9. **npm provenance.** See [proposed CI publishing](cli-release.md#proposed-ci-publishing-owner-action).

## Credential inventory and rotation

Rotate on compromise, on a maintainer leaving, and at least yearly. After any rotation run the monitor workflow by hand and confirm it passes.

| Credential | Where it lives | Used by | Rotate by |
| --- | --- | --- | --- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (owner role) | Vercel project environment (set by the Neon integration) | The service at runtime (`DATABASE_URL`), `snapshots:init` and withdrawals (`..._UNPOOLED`) | In the Neon console reset the `neondb_owner` password (Roles). The Vercel integration updates the variables; redeploy production and run the monitor. Expect brief 503 on snapshot reads until the redeploy finishes |
| `OMBELLE_SNAPSHOT_RATE_SECRET` | Vercel environment | HMAC of client identity for rate limits | Generate 32 or more random bytes (`openssl rand -hex 32`), set it in Vercel (production and preview), redeploy. Rotation resets every rate counter, so it briefly lifts per-client limits; do it off-peak |
| `MONITOR_DATABASE_URL` (role `ombelle_monitor`) | GitHub repository secret | The monitor workflow | `ALTER ROLE ombelle_monitor PASSWORD '…'` in the Neon SQL Editor, then update the secret |
| `BACKUP_DATABASE_URL` (role `ombelle_backup`) | GitHub repository secret | The backup workflow | `ALTER ROLE ombelle_backup PASSWORD '…'`, then update the secret. Take a manual backup first |
| `NEON_API_KEY` | GitHub repository secret | The preview-branch cleanup and sweep | Create a new project-scoped key in the Neon console, update the secret, revoke the old key |
| age private key | The owner's machine plus one offline copy | Decrypting backups | `age-keygen` a new pair, add the new public key to `.github/backup-recipients.txt` (keep the old one until old backups are re-encrypted or expire), commit, run a backup, restore-drill it with the new key, then remove the old recipient |
| npm publish credential | The owner's npm login and 2FA | `npm publish` | `npm logout`, log in again and rotate the recovery codes; if a token was ever created, revoke it under Access Tokens. With trusted publishing (proposed) no token exists |
| `MONITOR_HEARTBEAT_URL`, `MONITOR_ALERT_WEBHOOK_URL` | GitHub repository secrets | The monitor | Regenerate in the uptime or chat service, update the secrets |

If the database owner credential may have leaked, also treat published rows as possibly tampered with: restore-drill the latest backup and compare its fingerprint with production before trusting either (see [restore drill](#restore-drill)). The publications table is immutable by trigger, but the owner role can disable the trigger (SEC-04); the runtime refuses to serve when a trigger is disabled.

## Incidents

First move in every case: say what users see (status in the repository README or an issue), then follow the matching procedure. Everything here is a procedure to follow, not a record that it was tested in production; the drills the repository does run are the monitor, the backup and the restore drill.

### Bad production deploy

Every merge to `main` deploys production, gated only by the `verify` check, with no post-deploy smoke test other than the monitor.

1. In Vercel, open the project's Deployments, choose the last good production deployment and **Instant Rollback** (or `vercel rollback`). This is safe after a schema migration only because migrations are additive and the runtime accepts any schema at or above its minimum ([schema changes](hosted-deployment.md#changing-the-database-schema)); never roll back past a release that raised `postgresMinimumSchemaVersion`.
2. Run the monitor workflow (Actions → Monitor production → Run workflow) and confirm it passes.
3. Revert the bad commit on `main` with a revert PR; merging it deploys the fix and leaves rollback mode (Vercel stops auto-assigning production domains to new deployments until you promote one).
4. If the bad change was a schema migration, do not roll the schema back. Add a corrective migration.

### Bad CLI release

1. **Stop the spread.** Point the website at a working installer first: `pnpm version:set --published <last good version>` and merge to `main`, so install commands stop advertising the bad one. (The monitor's advertised-installer check passes as long as that version exists on npm.)
2. **Move the default.** `npm dist-tag add @ombelle-ui/cli@<good> latest`. Check with `npm view @ombelle-ui/cli dist-tags`. Unpinned `npx @ombelle-ui/cli` now gets the good version.
3. **Warn existing users.** `npm deprecate @ombelle-ui/cli@<bad> "<what is wrong and which version to use>"`. Deprecation is how 0.2.0 was handled. `npm unpublish` is only possible within 72 hours and breaks anyone pinned to the version; prefer deprecation.
4. Fix forward: release the next patch with the [release procedure](cli-release.md), add a regression test, and record the incident in [CLI release history](cli-release-history.md).

### Credential compromise

Identify which credential from the [inventory](#credential-inventory-and-rotation) leaked, rotate it immediately, then:

- **npm:** check `npm view @ombelle-ui/cli versions` and `time` for a version you did not publish; deprecate it and follow the bad CLI release steps.
- **Database owner or runtime URL:** rotate, then compare production against the latest backup as described above. Check `SELECT count(*) FROM ombelle.publications` against the summary of the last backup plus expected growth.
- **Neon API key:** rotate; review the Neon console's project history for branches or roles you did not create.
- **age private key:** assume past backups readable by the thief; rotate the key pair, and consider whether published payloads (which are public anyway) were the only content (they are: backups hold the `ombelle` schema only, which is public by design, plus idempotency keys and hashed rate keys).

### Neon outage, suspended compute or exhausted quota

The quota store is the same Neon database, so reads and publishing fail together: snapshot reads and published-code pages answer `503 SNAPSHOT_SERVICE_UNAVAILABLE`, publishing answers 503, and CLI installs by code fail with "Snapshot request failed". Local-file installs, offline installs from a verified cache and everything installed already are unaffected.

1. Check Neon's status page and the console: compute suspended or scaled to zero (the first request after idle normally takes 3 to 3.5 seconds), the monthly compute-hours quota, the storage allowance, the connection count.
2. A suspended-for-quota project needs an upgrade or waiting for the period to reset; both are owner decisions. A regional outage needs waiting.
3. Tell users the JSON export path still works: the editors let people download preset and recipe JSON and install with `ombelle init --preset ./file.json`.
4. After recovery, run the monitor and read the known code.
5. If the project or branch was deleted or corrupted, restore from the latest backup with the [restore drill](#restore-drill) into a new branch, point `DATABASE_URL` at it, and verify. Note the data lost is everything published since the last backup, at most about one day with the daily schedule.

Restoring a branch with Neon's "Restore from history" discards every publication made after the restore point and, as far as is known, keeps the pre-restore state as an extra branch. With a full 10-branch budget the restore can fail exactly when needed, so keep the sweep working and a spare slot free. Check Neon's current restore documentation before relying on this.

### Abusive publisher or abusive content

Withdrawal stops the service returning a payload; it cannot recall copies. The server logs nothing about clients and keys them only by HMAC, so a repeat publisher cannot be identified or blocked by the service; use a platform rule (Vercel firewall) if one is needed.

Withdraw with the **production Postgres backend** (not the SQLite example in the snapshot operations page): from the repository root, with the direct URL and the runtime URL of the production branch from the Vercel project environment, in a shell that keeps them out of history:

```powershell
$env:OMBELLE_SNAPSHOT_BACKEND = 'postgres'
$env:DATABASE_URL = '<pooled production URL>'
$env:DATABASE_URL_UNPOOLED = '<direct production URL>'
corepack pnpm snapshots:withdraw ps_<32 hex>@1 --reason abuse   # or rc_<32 hex>@1; reasons: abuse, security, operator-request
Remove-Item Env:DATABASE_URL, Env:DATABASE_URL_UNPOOLED
```

The command prints only `Snapshot store operation failed` on any failure, by design: check the reference, `OMBELLE_SNAPSHOT_BACKEND=postgres`, the URL, and that the schema is initialized. Verify with `curl -i https://ombelle-ui.vercel.app/api/v1/presets/<id>/1`, which must answer `410 SNAPSHOT_WITHDRAWN`. `snapshots:unwithdraw` reverses it. Record the reference and reason in a private note.

### Moving to another Postgres database

The SQLite adapter is for local use and is not a production fallback on Vercel (ephemeral filesystem). To move production to another Postgres, take a manual backup, restore it into the new database with the drill procedure, run `snapshots:init` (which applies any pending migrations), point `DATABASE_URL` and `DATABASE_URL_UNPOOLED` at it and verify a known code.

## Contacts and policy pages

Support goes through GitHub issues and vulnerability reports through GitHub private vulnerability reporting, which is enabled on the repository. The site publishes `/privacy`, `/security` and `/.well-known/security.txt`. Renew the `Expires` date in `apps/www/public/.well-known/security.txt` before it comes within 30 days; the monitor fails otherwise. Withdraw a reported publication with `snapshots:withdraw` (see the snapshot service operations).
