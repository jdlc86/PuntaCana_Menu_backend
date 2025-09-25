-- Corregir valores NULL en campos JSON para que sean arrays vacíos
-- Esto asegura consistencia en la base de datos

UPDATE menu_items 
SET 
  images = COALESCE(images, '[]'::jsonb),
  allergens = COALESCE(allergens, '[]'::jsonb),
  variants = COALESCE(variants, '[]'::jsonb),
  customizations = COALESCE(customizations, '[]'::jsonb)
WHERE 
  images IS NULL 
  OR allergens IS NULL 
  OR variants IS NULL 
  OR customizations IS NULL;

-- Verificar que todos los campos JSON ahora tienen valores válidos
SELECT 
  id, 
  name,
  CASE WHEN images IS NULL THEN 'NULL' ELSE 'ARRAY' END as images_status,
  CASE WHEN allergens IS NULL THEN 'NULL' ELSE 'ARRAY' END as allergens_status,
  CASE WHEN variants IS NULL THEN 'NULL' ELSE 'ARRAY' END as variants_status,
  CASE WHEN customizations IS NULL THEN 'NULL' ELSE 'ARRAY' END as customizations_status
FROM menu_items
ORDER BY id;
