-- Add scheduling fields to menu_items table for dish scheduling functionality

-- Add scheduling columns to menu_items table
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false, -- Whether this dish uses scheduling
ADD COLUMN IF NOT EXISTS schedule_days TEXT[], -- Array of days: ['monday', 'tuesday', etc.]
ADD COLUMN IF NOT EXISTS start_time TIME, -- Time when dish becomes available
ADD COLUMN IF NOT EXISTS end_time TIME; -- Time when dish becomes unavailable

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_menu_items_scheduled ON menu_items(is_scheduled) WHERE is_scheduled = true;
CREATE INDEX IF NOT EXISTS idx_menu_items_schedule_days ON menu_items USING GIN(schedule_days) WHERE schedule_days IS NOT NULL;

-- Update existing menu items to have is_scheduled = false by default
UPDATE menu_items SET is_scheduled = false WHERE is_scheduled IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'menu_items' 
AND column_name IN ('is_scheduled', 'schedule_days', 'start_time', 'end_time');
