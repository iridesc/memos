-- Add COMPLETED to memo row_status CHECK constraint.

ALTER TABLE memo DROP CONSTRAINT IF EXISTS memo_row_status_check;
ALTER TABLE memo ADD CONSTRAINT memo_row_status_check CHECK (row_status IN ('NORMAL', 'COMPLETED', 'ARCHIVED'));
