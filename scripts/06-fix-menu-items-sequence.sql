-- Corregir problema con la secuencia menu_items_id_seq
-- Este script maneja correctamente la secuencia después de recrear la tabla

-- Verificar si la secuencia existe y crearla si es necesario
DO $$
BEGIN
    -- Intentar encontrar la secuencia correcta para menu_items
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences 
        WHERE sequencename LIKE '%menu_items%id%seq%'
    ) THEN
        -- Si no existe ninguna secuencia, crear una nueva
        CREATE SEQUENCE menu_items_id_seq;
        
        -- Asignar la secuencia a la columna id
        ALTER TABLE menu_items ALTER COLUMN id SET DEFAULT nextval('menu_items_id_seq');
        
        -- Hacer que la secuencia sea propiedad de la columna
        ALTER SEQUENCE menu_items_id_seq OWNED BY menu_items.id;
    END IF;
END $$;

-- Actualizar la secuencia para que continúe desde el último ID
DO $$
DECLARE
    max_id INTEGER;
    seq_name TEXT;
BEGIN
    -- Obtener el ID máximo actual
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM menu_items;
    
    -- Encontrar el nombre correcto de la secuencia
    SELECT sequencename INTO seq_name 
    FROM pg_sequences 
    WHERE sequencename LIKE '%menu_items%id%seq%'
    LIMIT 1;
    
    -- Si encontramos la secuencia, actualizarla
    IF seq_name IS NOT NULL THEN
        EXECUTE format('SELECT setval(%L, %s)', seq_name, GREATEST(max_id, 1));
    END IF;
END $$;

-- Verificar que todo esté funcionando correctamente
SELECT 
    schemaname,
    sequencename,
    last_value
FROM pg_sequences 
WHERE sequencename LIKE '%menu_items%';
