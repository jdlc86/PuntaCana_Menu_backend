-- Add scheduling fields for alert announcements
-- This allows alerts to be programmed for specific days and times

ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS schedule_days TEXT[], -- Array of days: ['monday', 'tuesday', etc.]
ADD COLUMN IF NOT EXISTS start_time TIME, -- Time when alert becomes active
ADD COLUMN IF NOT EXISTS end_time TIME, -- Time when alert becomes inactive
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false; -- Whether this announcement uses scheduling

-- Create index for better performance on scheduled announcements
CREATE INDEX IF NOT EXISTS idx_announcements_scheduled ON announcements(is_scheduled) WHERE is_scheduled = true;
CREATE INDEX IF NOT EXISTS idx_announcements_schedule_days ON announcements USING GIN(schedule_days) WHERE schedule_days IS NOT NULL;

-- Update existing announcements to have is_scheduled = false by default
UPDATE announcements SET is_scheduled = false WHERE is_scheduled IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'announcements' 
AND column_name IN ('schedule_days', 'start_time', 'end_time', 'is_scheduled')
ORDER BY column_name;
