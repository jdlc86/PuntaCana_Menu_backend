-- Remove unused columns from menu_items table
-- This script removes columns that are not being used in the application

-- Remove preparation_time column
ALTER TABLE public.menu_items DROP COLUMN IF EXISTS preparation_time;

-- Remove is_featured column and its index
DROP INDEX IF EXISTS idx_menu_items_featured;
ALTER TABLE public.menu_items DROP COLUMN IF EXISTS is_featured;

-- Remove featured_until column
ALTER TABLE public.menu_items DROP COLUMN IF EXISTS featured_until;

-- Remove rating column
ALTER TABLE public.menu_items DROP COLUMN IF EXISTS rating;

-- Remove review_count column
ALTER TABLE public.menu_items DROP COLUMN IF EXISTS review_count;

-- Remove category_custom column
ALTER TABLE public.menu_items DROP COLUMN IF EXISTS category_custom;

-- Verify the remaining columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'menu_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;
