-- Complete schema setup for restaurant management system
-- This script creates all missing tables and columns with proper constraints

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    table_number INTEGER,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create waiter_calls table
CREATE TABLE IF NOT EXISTS public.waiter_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bill_requests table
CREATE TABLE IF NOT EXISTS public.bill_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add featured_until column to menu_items if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'menu_items' 
        AND column_name = 'featured_until'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.menu_items 
        ADD COLUMN featured_until TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(active);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_public ON public.reviews(public);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_waiter_calls_table_id ON public.waiter_calls(table_id);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_status ON public.waiter_calls(status);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_created_at ON public.waiter_calls(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bill_requests_table_id ON public.bill_requests(table_id);
CREATE INDEX IF NOT EXISTS idx_bill_requests_status ON public.bill_requests(status);
CREATE INDEX IF NOT EXISTS idx_bill_requests_created_at ON public.bill_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_menu_items_featured_until ON public.menu_items(featured_until);

-- Insert sample data for testing

-- Sample announcements
INSERT INTO public.announcements (title, content, type, active) VALUES
('Bienvenidos', 'Gracias por visitarnos. Disfruten de su experiencia gastronómica.', 'info', true),
('Promoción Especial', 'Descuento del 20% en postres hasta el final del mes.', 'success', true),
('Nuevo Menú', 'Hemos actualizado nuestro menú con nuevos platos deliciosos.', 'info', true)
ON CONFLICT DO NOTHING;

-- Sample reviews
INSERT INTO public.reviews (customer_name, rating, comment, table_number, public) VALUES
('María García', 5, 'Excelente servicio y comida deliciosa. Muy recomendado.', 1, true),
('Juan Pérez', 4, 'Buena experiencia en general, el ambiente es muy agradable.', 2, true),
('Ana López', 5, 'La mejor paella que he probado. Volveré sin duda.', 3, true),
('Carlos Ruiz', 4, 'Servicio rápido y platos bien presentados.', 1, true),
('Laura Martín', 5, 'Increíble atención al cliente y sabores auténticos.', 4, true)
ON CONFLICT DO NOTHING;

-- Update some menu items to be featured
UPDATE public.menu_items 
SET featured_until = NOW() + INTERVAL '7 days'
WHERE name IN ('Paella Valenciana', 'Gazpacho Andaluz', 'Crema Catalana')
AND featured_until IS NULL;

-- Refresh the schema cache by updating table statistics
ANALYZE public.announcements;
ANALYZE public.reviews;
ANALYZE public.waiter_calls;
ANALYZE public.bill_requests;
ANALYZE public.menu_items;

-- Grant necessary permissions
GRANT ALL ON public.announcements TO authenticated;
GRANT ALL ON public.reviews TO authenticated;
GRANT ALL ON public.waiter_calls TO authenticated;
GRANT ALL ON public.bill_requests TO authenticated;

GRANT ALL ON public.announcements TO anon;
GRANT ALL ON public.reviews TO anon;
GRANT ALL ON public.waiter_calls TO anon;
GRANT ALL ON public.bill_requests TO anon;

-- Verify tables were created successfully
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('announcements', 'reviews', 'waiter_calls', 'bill_requests')
ORDER BY tablename;

-- Verify the featured_until column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'menu_items' 
AND table_schema = 'public'
AND column_name = 'featured_until';
