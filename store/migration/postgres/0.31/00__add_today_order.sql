-- Add today_order column for fractional-indexed Today view ordering.
ALTER TABLE memo ADD COLUMN today_order TEXT DEFAULT NULL;
