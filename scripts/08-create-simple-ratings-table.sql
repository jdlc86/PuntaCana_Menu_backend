-- Script para crear tabla de valoraciones simplificada
-- Sistema sin nombres de usuario, solo "Usuario X Mesa Y - 5 estrellas"

-- Crear tabla de valoraciones simplificada
CREATE TABLE IF NOT EXISTS simple_ratings (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    user_number INTEGER NOT NULL, -- Usuario 1, Usuario 2, etc.
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_simple_ratings_table ON simple_ratings(table_id);
CREATE INDEX IF NOT EXISTS idx_simple_ratings_rating ON simple_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_simple_ratings_created ON simple_ratings(created_at);

-- Función para obtener el siguiente número de usuario
CREATE OR REPLACE FUNCTION get_next_user_number()
RETURNS INTEGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(user_number), 0) + 1 INTO next_num FROM simple_ratings;
    RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar automáticamente el número de usuario
CREATE OR REPLACE FUNCTION assign_user_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_number IS NULL THEN
        NEW.user_number := get_next_user_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_user_number
    BEFORE INSERT ON simple_ratings
    FOR EACH ROW
    EXECUTE FUNCTION assign_user_number();

-- Insertar datos de ejemplo
INSERT INTO simple_ratings (table_id, order_id, user_number, rating) VALUES
(1, 1, 1, 5),
(2, 2, 2, 4),
(1, 1, 3, 5),
(3, NULL, 4, 3),
(2, 2, 5, 4);

-- Comentarios sobre el diseño:
-- - user_number: Número secuencial automático (Usuario 1, Usuario 2, etc.)
-- - rating: Solo valoración general de 1-5 estrellas
-- - table_id: Referencia a la mesa
-- - order_id: Opcional, referencia al pedido si existe
-- - Sin campos de texto para comentarios
-- - Sin nombres de usuario reales
-- - Sin subcategorías (comida, servicio, ambiente)
