-- Adding translation columns to announcements table
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS title_translations TEXT,
ADD COLUMN IF NOT EXISTS content_translations TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'announcements' 
AND column_name IN ('title_translations', 'content_translations');
