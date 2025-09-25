-- Migration script to add missing fields to existing tables table
-- This script adds the fields needed for the enhanced table management system

-- First, let's check if the table exists and add missing columns
DO $$
BEGIN
    -- Add status column if it doesn't exist (replaces is_available with more options)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tables' AND column_name = 'status') THEN
        ALTER TABLE public.tables ADD COLUMN status VARCHAR(20) DEFAULT 'available' 
        CHECK (status IN ('available', 'occupied', 'blocked', 'maintenance'));
        
        -- Migrate existing is_available data to status
        UPDATE public.tables SET status = CASE 
            WHEN is_available = true THEN 'available'
            ELSE 'blocked'
        END;
    END IF;

    -- Add qr_code_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tables' AND column_name = 'qr_code_url') THEN
        ALTER TABLE public.tables ADD COLUMN qr_code_url TEXT;
    END IF;

    -- Add is_active column if it doesn't exist (for soft delete)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tables' AND column_name = 'is_active') THEN
        ALTER TABLE public.tables ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- Add notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tables' AND column_name = 'notes') THEN
        ALTER TABLE public.tables ADD COLUMN notes TEXT;
    END IF;

    -- Modify table_number to support text format like "Mesa: 1", "Mesa: A2"
    -- First check if it's still INTEGER type
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tables' AND column_name = 'table_number' AND data_type = 'integer') THEN
        
        -- Convert existing integer values to the new format
        ALTER TABLE public.tables ALTER COLUMN table_number TYPE TEXT USING ('Mesa: ' || table_number::TEXT);
        
        -- Update the unique constraint
        ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_table_number_key;
        ALTER TABLE public.tables ADD CONSTRAINT tables_table_number_unique UNIQUE (table_number);
    END IF;

END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_tables_status ON public.tables(status);
CREATE INDEX IF NOT EXISTS idx_tables_is_active ON public.tables(is_active) WHERE is_active = true;

-- Update RLS policies to work with the new status column
DROP POLICY IF EXISTS "Allow public read access to tables" ON public.tables;
CREATE POLICY "Allow public read access to tables" ON public.tables 
    FOR SELECT USING (is_active = true AND status IN ('available', 'occupied'));

-- Add comment to document the table structure
COMMENT ON TABLE public.tables IS 'Restaurant tables with enhanced management features including status tracking, QR codes, and soft delete';
COMMENT ON COLUMN public.tables.table_number IS 'Table identifier in format "Mesa: X" where X can be alphanumeric';
COMMENT ON COLUMN public.tables.status IS 'Table status: available, occupied, blocked, maintenance';
COMMENT ON COLUMN public.tables.qr_code_url IS 'URL to the generated QR code for this table';
COMMENT ON COLUMN public.tables.is_active IS 'Soft delete flag - false means table is deleted';
COMMENT ON COLUMN public.tables.notes IS 'Administrative notes about the table';
