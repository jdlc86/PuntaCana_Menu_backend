-- Eliminar completamente la tabla menu_categories ya que no es necesaria
-- Los items del menú ahora usan directamente el nombre de la categoría

-- Eliminar la tabla menu_categories
DROP TABLE IF EXISTS menu_categories CASCADE;

-- Eliminar políticas RLS relacionadas si existen
DROP POLICY IF EXISTS "Allow public read access to menu categories" ON menu_categories;
DROP POLICY IF EXISTS "Allow admin full access to menu categories" ON menu_categories;

-- Eliminar triggers relacionados si existen
DROP TRIGGER IF EXISTS update_menu_categories_updated_at ON menu_categories;
