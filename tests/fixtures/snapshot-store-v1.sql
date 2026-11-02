
  CREATE TABLE snapshots (
    id TEXT PRIMARY KEY CHECK(length(id) = 35 AND substr(id, 1, 3) = 'ps_' AND substr(id, 4) NOT GLOB '*[^0-9a-f]*'),
    revision INTEGER NOT NULL CHECK(revision = 1),
    response TEXT NOT NULL,
    response_hash TEXT NOT NULL CHECK(length(response_hash) = 64 AND response_hash NOT GLOB '*[^0-9a-f]*'),
    preset_hash TEXT NOT NULL CHECK(length(preset_hash) = 64 AND preset_hash NOT GLOB '*[^0-9a-f]*'),
    bytes INTEGER NOT NULL CHECK(bytes > 0 AND bytes <= 131072 AND bytes = length(CAST(response AS BLOB)))
  ) STRICT;
  CREATE TABLE capacity (
    singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
    records INTEGER NOT NULL CHECK(records >= 0 AND records <= 100000),
    bytes INTEGER NOT NULL CHECK(bytes >= 0 AND bytes <= 536870912)
  ) STRICT;
  INSERT INTO capacity VALUES (1, 0, 0);
  CREATE TRIGGER snapshots_no_update BEFORE UPDATE ON snapshots
    BEGIN SELECT RAISE(ABORT, 'immutable snapshot'); END;
  CREATE TRIGGER snapshots_no_delete BEFORE DELETE ON snapshots
    BEGIN SELECT RAISE(ABORT, 'immutable snapshot'); END;
  CREATE TRIGGER snapshots_no_replace BEFORE INSERT ON snapshots
    WHEN EXISTS (SELECT 1 FROM snapshots WHERE id = NEW.id)
    BEGIN SELECT RAISE(ABORT, 'immutable snapshot'); END;
  CREATE TRIGGER snapshots_capacity AFTER INSERT ON snapshots
    BEGIN UPDATE capacity SET records = records + 1, bytes = bytes + NEW.bytes WHERE singleton = 1; END;
  CREATE TABLE idempotency_keys (
    key TEXT PRIMARY KEY,
    preset_hash TEXT NOT NULL,
    snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
    expires_at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX idempotency_expiry ON idempotency_keys(expires_at);
  CREATE TABLE rate_buckets (
    kind TEXT NOT NULL CHECK(kind IN ('attempt', 'client', 'global')),
    client_key TEXT NOT NULL,
    window INTEGER NOT NULL,
    count INTEGER NOT NULL CHECK(count >= 0),
    PRIMARY KEY(kind, client_key, window)
  ) STRICT;
  CREATE INDEX rate_bucket_expiry ON rate_buckets(kind, window);
  CREATE TABLE withdrawals (
    snapshot_id TEXT PRIMARY KEY REFERENCES snapshots(id),
    reason TEXT NOT NULL CHECK(reason IN ('abuse', 'security', 'operator-request')),
    withdrawn_at INTEGER NOT NULL
  ) STRICT;
  PRAGMA user_version = 1;
