-- Update waiter_calls table to match new requirements
-- Remove unnecessary fields and add new ones

-- Add the new 'tipo' field
ALTER TABLE public.waiter_calls 
ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'General' CHECK (tipo IN ('General', 'Cuenta'));

-- Add updated_at field that was missing
ALTER TABLE public.waiter_calls 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Remove unused columns completely
ALTER TABLE public.waiter_calls 
DROP COLUMN IF EXISTS message;

ALTER TABLE public.waiter_calls 
DROP COLUMN IF EXISTS priority;

-- Update existing records to have default tipo
UPDATE public.waiter_calls 
SET tipo = 'General' 
WHERE tipo IS NULL;

-- Update status values to match new requirements and handle resolved_at field
-- Map existing values: pending -> Pendiente, completed -> Atendida, in_progress -> Pendiente
UPDATE public.waiter_calls 
SET status = CASE 
    WHEN status = 'pending' THEN 'Pendiente'
    WHEN status = 'in_progress' THEN 'Pendiente' 
    WHEN status = 'completed' THEN 'Atendida'
    WHEN resolved_at IS NOT NULL THEN 'Atendida'
    ELSE 'Atendida'
END;

-- Update the status constraint to match new values
ALTER TABLE public.waiter_calls 
DROP CONSTRAINT IF EXISTS waiter_calls_status_check;

ALTER TABLE public.waiter_calls 
ADD CONSTRAINT waiter_calls_status_check 
CHECK (status IN ('Pendiente', 'Atendida'));

-- Update the tipo constraint
ALTER TABLE public.waiter_calls 
DROP CONSTRAINT IF EXISTS waiter_calls_tipo_check;

ALTER TABLE public.waiter_calls 
ADD CONSTRAINT waiter_calls_tipo_check 
CHECK (tipo IN ('General', 'Cuenta'));

-- Set default status to 'Atendida' as requested
ALTER TABLE public.waiter_calls 
ALTER COLUMN status SET DEFAULT 'Atendida';

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_waiter_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_waiter_calls_updated_at_trigger ON public.waiter_calls;
CREATE TRIGGER update_waiter_calls_updated_at_trigger
    BEFORE UPDATE ON public.waiter_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_waiter_calls_updated_at();

-- Create index for the new tipo field
CREATE INDEX IF NOT EXISTS idx_waiter_calls_tipo ON public.waiter_calls(tipo);

-- Create index for updated_at field for better performance
CREATE INDEX IF NOT EXISTS idx_waiter_calls_updated_at ON public.waiter_calls(updated_at);

-- Final table structure should only have: id, table_id, tipo, status, created_at, updated_at
-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'waiter_calls' 
AND table_schema = 'public'
ORDER BY ordinal_position;
