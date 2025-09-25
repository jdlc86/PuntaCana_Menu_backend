-- Recreate waiter_calls table with proper foreign key relationship
-- This script will drop and recreate the waiter_calls table with the correct foreign key constraint

-- Drop the existing waiter_calls table if it exists
DROP TABLE IF EXISTS waiter_calls CASCADE;

-- Create waiter_calls table with proper foreign key relationship
CREATE TABLE waiter_calls (
    id SERIAL PRIMARY KEY,
    table_id INTEGER NOT NULL,
    tipo VARCHAR(20) DEFAULT 'General' CHECK (tipo IN ('General', 'Cuenta')),
    status VARCHAR(20) DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'Atendida')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Adding explicit foreign key constraint to tables table
    CONSTRAINT fk_waiter_calls_table_id 
        FOREIGN KEY (table_id) 
        REFERENCES tables(id) 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_waiter_calls_table_id ON waiter_calls(table_id);
CREATE INDEX idx_waiter_calls_status ON waiter_calls(status);
CREATE INDEX idx_waiter_calls_created_at ON waiter_calls(created_at);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_waiter_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_waiter_calls_updated_at
    BEFORE UPDATE ON waiter_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_waiter_calls_updated_at();

-- Insert some test data to verify the relationship works
INSERT INTO waiter_calls (table_id, tipo, status) VALUES 
(1, 'General', 'Pendiente'),
(2, 'Cuenta', 'Pendiente');

-- Verify the foreign key relationship works
SELECT 
    wc.id,
    wc.table_id,
    t.table_number,
    wc.tipo,
    wc.status,
    wc.created_at
FROM waiter_calls wc
JOIN tables t ON wc.table_id = t.id
ORDER BY wc.created_at DESC;
