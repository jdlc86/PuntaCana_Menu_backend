-- Agregar campos JSON a la tabla menu_items existente para simplificar el esquema
-- Agregar campos JSON para variantes, personalizaciones, alérgenos e imágenes
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS allergens JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS customizations JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Otras';

-- Insertar alérgenos predefinidos como datos de referencia (no como tabla separada)
-- Los alérgenos se almacenarán como array JSON en cada plato
-- Ejemplo de estructura JSON para allergens: ["Gluten", "Lactosa", "Frutos de cáscara"]

-- Ejemplo de estructura JSON para variants:
-- [{"name": "Pequeña", "price": 0}, {"name": "Grande", "price": 2.50}]

-- Ejemplo de estructura JSON para customizations:
-- [{"name": "Extra queso", "type": "paid", "price": 1.50}, {"name": "Sin cebolla", "type": "free", "price": 0}]

-- Ejemplo de estructura JSON para images:
-- [{"url": "/images/plato1.jpg", "isPrimary": true}, {"url": "/images/plato1-2.jpg", "isPrimary": false}]

-- Actualizar platos existentes con categorías apropiadas
UPDATE menu_items SET category = 'Principal' WHERE name ILIKE '%pizza%' OR name ILIKE '%pasta%';
UPDATE menu_items SET category = 'Bebidas' WHERE name ILIKE '%agua%' OR name ILIKE '%refresco%' OR name ILIKE '%cerveza%';
UPDATE menu_items SET category = 'Postre' WHERE name ILIKE '%helado%' OR name ILIKE '%tarta%' OR name ILIKE '%flan%';

-- Verificar la estructura actualizada
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'menu_items' 
ORDER BY ordinal_position;
