-- Script para crear tablas de funcionalidades avanzadas
-- Ejecutar después de 01-create-tables.sql y 02-seed-data.sql

-- Tabla para anuncios del restaurante
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general', -- general, promotion, special, maintenance
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para llamadas de camarero
CREATE TABLE IF NOT EXISTS waiter_calls (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
    call_type VARCHAR(50) NOT NULL, -- service, bill, complaint, assistance
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, resolved
    priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=urgent
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255)
);

-- Tabla para solicitudes de cuenta
CREATE TABLE IF NOT EXISTS bill_requests (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, ready, delivered
    payment_method VARCHAR(50), -- cash, card, digital
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    delivered_at TIMESTAMP
);

-- Tabla para valoraciones y reseñas
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

-- Actualizar tabla menu_items para agregar campo featured (platos estrella)
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_status ON waiter_calls(status, created_at);
CREATE INDEX IF NOT EXISTS idx_bill_requests_status ON bill_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating, created_at);
CREATE INDEX IF NOT EXISTS idx_menu_items_featured ON menu_items(is_featured, featured_until);

-- Insertar datos de ejemplo para anuncios
INSERT INTO announcements (title, content, type, priority) VALUES
('¡Bienvenidos!', 'Gracias por visitarnos. Disfruten de su experiencia gastronómica.', 'general', 1),
('Oferta Especial', '20% de descuento en postres hasta las 18:00', 'promotion', 3),
('Plato del Día', 'Prueba nuestro nuevo risotto de mariscos - ¡Edición limitada!', 'special', 2);

-- Marcar algunos platos como estrella
UPDATE menu_items SET is_featured = true, rating = 4.8, review_count = 25 WHERE name = 'Paella Valenciana';
UPDATE menu_items SET is_featured = true, rating = 4.6, review_count = 18 WHERE name = 'Salmón a la Plancha';

-- Insertar algunas valoraciones de ejemplo
INSERT INTO reviews (order_id, table_id, customer_name, rating, food_rating, service_rating, ambiance_rating, comment) VALUES
(1, 1, 'María García', 5, 5, 4, 5, 'Excelente comida y ambiente muy acogedor. Volveremos sin duda.'),
(2, 2, 'Juan Pérez', 4, 4, 5, 4, 'Muy buen servicio, la paella estaba deliciosa.');
