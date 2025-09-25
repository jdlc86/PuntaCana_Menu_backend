-- Create storage bucket for menu images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Set up RLS policy for public read access
CREATE POLICY "Public read access for menu images" ON storage.objects
FOR SELECT USING (bucket_id = 'menu-images');

-- Set up RLS policy for authenticated upload access
CREATE POLICY "Authenticated upload access for menu images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'menu-images');

-- Set up RLS policy for authenticated update access
CREATE POLICY "Authenticated update access for menu images" ON storage.objects
FOR UPDATE USING (bucket_id = 'menu-images');

-- Set up RLS policy for authenticated delete access
CREATE POLICY "Authenticated delete access for menu images" ON storage.objects
FOR DELETE USING (bucket_id = 'menu-images');
