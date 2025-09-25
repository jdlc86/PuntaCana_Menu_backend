-- Restructurar tabla menu_items según especificaciones del usuario
-- Eliminar campos innecesarios y agregar campos requeridos

-- Crear función update_updated_at_column si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Primero, crear una tabla temporal con la nueva estructura
CREATE TABLE IF NOT EXISTS menu_items_new (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'Otras',
  price DECIMAL(10,2) NOT NULL,
  is_available BOOLEAN DEFAULT true,
  description TEXT,
  allergens JSONB DEFAULT '[]'::jsonb, -- JSON para alérgenos
  variants JSONB DEFAULT '[]'::jsonb, -- JSON para variantes
  customizations JSONB DEFAULT '[]'::jsonb, -- JSON para personalización
  images JSONB DEFAULT '[]'::jsonb, -- JSON para imágenes
  is_featured BOOLEAN DEFAULT false, -- Campo "estrella"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrar datos existentes a la nueva estructura
INSERT INTO menu_items_new (
  id, name, category, price, is_available, description, 
  allergens, variants, customizations, images, is_featured
)
SELECT 
  id,
  name,
  category,
  price,
  is_available,
  description,
  COALESCE(
    CASE 
      WHEN allergens IS NOT NULL AND array_length(allergens, 1) > 0 
      THEN to_jsonb(allergens)
      ELSE '[]'::jsonb
    END, '[]'::jsonb
  ) as allergens,
  '[]'::jsonb as variants, -- Inicializar como array vacío
  '[]'::jsonb as customizations, -- Inicializar como array vacío
  '[]'::jsonb as images, -- Inicializar como array vacío
  false as is_featured -- Por defecto no es estrella
FROM menu_items;

-- Eliminar la tabla antigua
DROP TABLE IF EXISTS menu_items CASCADE;

-- Renombrar la nueva tabla
ALTER TABLE menu_items_new RENAME TO menu_items;

-- Recrear índices
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_featured ON menu_items(is_featured);

-- Recrear trigger para updated_at
CREATE TRIGGER update_menu_items_updated_at 
  BEFORE UPDATE ON menu_items 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Actualizar secuencia para que continúe desde el último ID
SELECT setval('menu_items_id_seq', COALESCE((SELECT MAX(id) FROM menu_items), 1));
