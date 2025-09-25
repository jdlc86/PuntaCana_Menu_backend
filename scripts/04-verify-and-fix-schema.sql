-- Script de verificación y corrección del esquema
-- Ejecutar si hay problemas con las tablas faltantes

-- Verificar qué tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar columnas de menu_items
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'menu_items'
ORDER BY ordinal_position;

-- Crear tablas faltantes si no existen
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS waiter_calls (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
    call_type VARCHAR(50) NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS bill_requests (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    delivered_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
    customer_name VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    food_rating INTEGER CHECK (food_rating >= 1 AND food_rating <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    ambiance_rating INTEGER CHECK (ambiance_rating >= 1 AND ambiance_rating <= 5),
    comment TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar columnas faltantes a menu_items
DO $$ 
BEGIN
    -- Agregar is_featured si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'menu_items' AND column_name = 'is_featured') THEN
        ALTER TABLE menu_items ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;
    
    -- Agregar featured_until si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'menu_items' AND column_name = 'featured_until') THEN
        ALTER TABLE menu_items ADD COLUMN featured_until TIMESTAMP;
    END IF;
    
    -- Agregar rating si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'menu_items' AND column_name = 'rating') THEN
        ALTER TABLE menu_items ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.0;
    END IF;
    
    -- Agregar review_count si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'menu_items' AND column_name = 'review_count') THEN
        ALTER TABLE menu_items ADD COLUMN review_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_status ON waiter_calls(status, created_at);
CREATE INDEX IF NOT EXISTS idx_bill_requests_status ON bill_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating, created_at);
CREATE INDEX IF NOT EXISTS idx_menu_items_featured ON menu_items(is_featured, featured_until);

-- Insertar datos de ejemplo solo si las tablas están vacías
INSERT INTO announcements (title, content, type, priority) 
SELECT 'Bienvenidos', 'Gracias por visitarnos. Disfruten de su experiencia gastronómica.', 'general', 1
WHERE NOT EXISTS (SELECT 1 FROM announcements);

INSERT INTO announcements (title, content, type, priority) 
SELECT 'Oferta Especial', '20% de descuento en postres hasta las 18:00', 'promotion', 3
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE type = 'promotion');

INSERT INTO announcements (title, content, type, priority) 
SELECT 'Plato del Día', 'Prueba nuestro nuevo risotto de mariscos - ¡Edición limitada!', 'special', 2
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE type = 'special');

-- Actualizar algunos platos como estrella
UPDATE menu_items SET is_featured = true, rating = 4.8, review_count = 25 
WHERE name = 'Paella Valenciana' AND is_featured = false;

UPDATE menu_items SET is_featured = true, rating = 4.6, review_count = 18 
WHERE name = 'Salmón a la Plancha' AND is_featured = false;

-- Insertar valoraciones de ejemplo
INSERT INTO reviews (order_id, table_id, customer_name, rating, food_rating, service_rating, ambiance_rating, comment) 
SELECT 1, 1, 'María García', 5, 5, 4, 5, 'Excelente comida y ambiente muy acogedor. Volveremos sin duda.'
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE customer_name = 'María García');

INSERT INTO reviews (order_id, table_id, customer_name, rating, food_rating, service_rating, ambiance_rating, comment) 
SELECT 2, 2, 'Juan Pérez', 4, 4, 5, 4, 'Muy buen servicio, la paella estaba deliciosa.'
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE customer_name = 'Juan Pérez');

-- Mostrar resumen final
SELECT 'announcements' as table_name, count(*) as records FROM announcements
UNION ALL
SELECT 'waiter_calls', count(*) FROM waiter_calls
UNION ALL
SELECT 'bill_requests', count(*) FROM bill_requests
UNION ALL
SELECT 'reviews', count(*) FROM reviews;
