-- Add COMPLETED to row_status CHECK constraint on memo table.
-- SQLite doesn't support ALTER CHECK, so recreate the table with the updated constraint.

PRAGMA foreign_keys = off;

CREATE TABLE memo_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL UNIQUE,
  creator_id INTEGER NOT NULL,
  created_ts BIGINT NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_ts BIGINT NOT NULL DEFAULT (strftime('%s', 'now')),
  row_status TEXT NOT NULL CHECK (row_status IN ('NORMAL', 'COMPLETED', 'ARCHIVED')) DEFAULT 'NORMAL',
  content TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL CHECK (visibility IN ('PUBLIC', 'PROTECTED', 'PRIVATE')) DEFAULT 'PRIVATE',
  pinned INTEGER NOT NULL CHECK (pinned IN (0, 1)) DEFAULT 0,
  plan_start_ts BIGINT DEFAULT NULL,
  plan_end_ts BIGINT DEFAULT NULL,
  payload TEXT NOT NULL DEFAULT '{}'
);

INSERT INTO memo_new (
  id, uid, creator_id, created_ts, updated_ts,
  row_status, content, visibility, pinned,
  plan_start_ts, plan_end_ts, payload
)
SELECT
  id, uid, creator_id, created_ts, updated_ts,
  row_status, content, visibility, pinned,
  plan_start_ts, plan_end_ts, payload
FROM memo;

DROP TABLE memo;
ALTER TABLE memo_new RENAME TO memo;

PRAGMA foreign_keys = on;