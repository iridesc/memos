-- Add completed_ts and archived_ts columns, which record when a memo entered
-- the COMPLETED / ARCHIVED state. Server-managed only (not client writable).
ALTER TABLE memo ADD COLUMN completed_ts BIGINT DEFAULT NULL;
ALTER TABLE memo ADD COLUMN archived_ts BIGINT DEFAULT NULL;

-- Backfill historical rows with the last update time so auto-archive keeps its
-- previous behaviour (it used to compare against updated_ts).
UPDATE memo SET completed_ts = updated_ts WHERE row_status = 'COMPLETED' AND completed_ts IS NULL;
UPDATE memo SET archived_ts = updated_ts WHERE row_status = 'ARCHIVED' AND archived_ts IS NULL;
