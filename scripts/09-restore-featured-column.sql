-- Restore the is_featured column and functionality
-- This script adds back the featured functionality that was previously removed

-- Add is_featured column back to menu_items table
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Create index for better performance on featured queries
CREATE INDEX IF NOT EXISTS idx_menu_items_featured ON public.menu_items(is_featured) WHERE is_featured = true;

-- Update some existing items to be featured for testing (optional)
-- UPDATE public.menu_items SET is_featured = true WHERE id IN (SELECT id FROM public.menu_items LIMIT 2);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'menu_items' 
AND table_schema = 'public'
AND column_name = 'is_featured'
ORDER BY ordinal_position;
