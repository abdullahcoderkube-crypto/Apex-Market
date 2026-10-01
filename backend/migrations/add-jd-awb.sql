-- Rename the lowercase mangled column to the correct snake_case name
ALTER TABLE orders RENAME COLUMN jdshipmentid TO jd_shipment_id;

-- Drop the bad jdawb column (wrong name, no underscore)
ALTER TABLE orders DROP COLUMN IF EXISTS jdawb;
