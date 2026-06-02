-- Add plan start and end time columns.
ALTER TABLE memo ADD COLUMN plan_start_ts BIGINT DEFAULT NULL;
ALTER TABLE memo ADD COLUMN plan_end_ts BIGINT DEFAULT NULL;
