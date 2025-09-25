-- Modificar tabla menu_items para usar nombre de categoría en lugar de category_id
-- Agregar columna category como texto
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Actualizar los items existentes para copiar el nombre de la categoría
UPDATE menu_items 
SET category = (
  SELECT name 
  FROM menu_categories 
  WHERE menu_categories.id = menu_items.category_id
)
WHERE category_id IS NOT NULL;

-- Establecer categoría por defecto para items sin categoría
UPDATE menu_items 
SET category = 'Otras' 
WHERE category IS NULL OR category = '';

-- Hacer que la columna category sea NOT NULL
ALTER TABLE menu_items ALTER COLUMN category SET NOT NULL;

-- Eliminar la restricción de clave foránea y la columna category_id
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;
ALTER TABLE menu_items DROP COLUMN IF EXISTS category_id;

-- Crear índice para la nueva columna category
CREATE INDEX IF NOT EXISTS idx_menu_items_category_name ON menu_items(category);
