-- Check current constraint and fix table status constraint
-- First, let's see what the current constraint allows
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'tables_status_check';

-- Drop the existing constraint if it exists
ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_status_check;

-- Add the correct constraint that matches our application logic
ALTER TABLE tables ADD CONSTRAINT tables_status_check 
CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance'));

-- Update any existing invalid status values to 'available'
UPDATE tables 
SET status = 'available' 
WHERE status NOT IN ('available', 'occupied', 'reserved', 'maintenance');
