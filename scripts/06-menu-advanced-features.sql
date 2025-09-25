-- Script para agregar funcionalidades avanzadas al menú
-- Variantes, personalizaciones, alérgenos y gestión de imágenes

-- Tabla de alérgenos predefinidos
CREATE TABLE IF NOT EXISTS allergens (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relación muchos a muchos entre platos y alérgenos
CREATE TABLE IF NOT EXISTS menu_item_allergens (
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    allergen_id INTEGER REFERENCES allergens(id) ON DELETE CASCADE,
    PRIMARY KEY (menu_item_id, allergen_id)
);

-- Tabla de variantes de platos (tallas, tamaños, etc.)
CREATE TABLE IF NOT EXISTS menu_item_variants (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price_modifier DECIMAL(10,2) DEFAULT 0,
    description TEXT,
    is_available BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de opciones de personalización
CREATE TABLE IF NOT EXISTS customization_options (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('free', 'paid')),
    price DECIMAL(10,2) DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relación entre platos y opciones de personalización
CREATE TABLE IF NOT EXISTS menu_item_customizations (
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    customization_option_id INTEGER REFERENCES customization_options(id) ON DELETE CASCADE,
    PRIMARY KEY (menu_item_id, customization_option_id)
);

-- Tabla de imágenes de platos
CREATE TABLE IF NOT EXISTS menu_item_images (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar columnas adicionales a menu_items
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS category_custom VARCHAR(100),
ADD COLUMN IF NOT EXISTS nutritional_info JSONB;

-- Insertar alérgenos predefinidos
INSERT INTO allergens (name, icon, description) VALUES
('Gluten', '🌾', 'Contiene gluten'),
('Cacahuete', '🥜', 'Contiene cacahuetes'),
('Apio', '🥬', 'Contiene apio'),
('Altramuces', '🫘', 'Contiene altramuces'),
('Crustáceos', '🦐', 'Contiene crustáceos'),
('Huevo', '🥚', 'Contiene huevo'),
('Soja', '🫛', 'Contiene soja'),
('Mostaza', '🟡', 'Contiene mostaza'),
('Moluscos', '🐚', 'Contiene moluscos'),
('Sulfitos', '🧪', 'Contiene sulfitos'),
('Leche/Lactosa', '🥛', 'Contiene lácteos'),
('Sésamo', '🌰', 'Contiene sésamo'),
('Pescado', '🐟', 'Contiene pescado'),
('Frutos de cáscara', '🌰', 'Contiene frutos secos')
ON CONFLICT (name) DO NOTHING;

-- Crear índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_menu_item_allergens_item ON menu_item_allergens(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_variants_item ON menu_item_variants(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_customizations_item ON menu_item_customizations(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_images_item ON menu_item_images(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_images_primary ON menu_item_images(is_primary);

-- Insertar algunas opciones de personalización de ejemplo
INSERT INTO customization_options (name, type, price) VALUES
('Extra queso', 'paid', 2.00),
('Sin cebolla', 'free', 0.00),
('Picante', 'free', 0.00),
('Doble ración', 'paid', 5.00),
('Sin sal', 'free', 0.00)
ON CONFLICT DO NOTHING;

-- Verificar que todo se creó correctamente
SELECT 'allergens' as table_name, count(*) as records FROM allergens
UNION ALL
SELECT 'customization_options', count(*) FROM customization_options
UNION ALL
SELECT 'menu_item_variants', count(*) FROM menu_item_variants
UNION ALL
SELECT 'menu_item_images', count(*) FROM menu_item_images;
