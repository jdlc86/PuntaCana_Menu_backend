-- Fix categories system - ensure menu_categories table has all necessary categories
-- This script will create the menu_categories table if it doesn't exist and populate it with Spanish restaurant categories

-- Create menu_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Using INSERT WHERE NOT EXISTS instead of ON CONFLICT to avoid constraint issues
-- Insert comprehensive Spanish restaurant categories only if they don't already exist
INSERT INTO public.menu_categories (name, description, display_order, is_active)
SELECT 'Entrantes', 'Platos para comenzar la comida', 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE name = 'Entrantes');

INSERT INTO public.menu_categories (name, description, display_order, is_active)
SELECT 'Principal', 'Platos principales', 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE name = 'Principal');

INSERT INTO public.menu_categories (name, description, display_order, is_active)
SELECT 'Postres', 'Dulces y postres para finalizar', 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE name = 'Postres');

INSERT INTO public.menu_categories (name, description, display_order, is_active)
SELECT 'Bebidas', 'Bebidas frías y calientes', 4, true
WHERE NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE name = 'Bebidas');

INSERT INTO public.menu_categories (name, description, display_order, is_active)
SELECT 'Ensaladas', 'Ensaladas frescas y saludables', 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE name = 'Ensaladas');

INSERT INTO public.menu_categories (name, description, display_order, is_active)
SELECT 'Sopas', 'Sopas y cremas calientes', 6, true
WHERE NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE name = 'Sopas');

INSERT INTO public.menu_categories (name, description, display_order, is_active)
SELECT 'Pescados', 'Especialidades de pescado y mariscos', 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE name = 'Pescados');

INSERT INTO public.menu_categories (name, description, display_order, is_active)
SELECT 'Carnes', 'Carnes a la parrilla y guisos', 8, true
WHERE NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE name = 'Carnes');

INSERT INTO public.menu_categories (name, description, display_order, is_active)
SELECT 'Pasta', 'Pasta italiana y platos de arroz', 9, true
WHERE NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE name = 'Pasta');

INSERT INTO public.menu_categories (name, description, display_order, is_active)
SELECT 'Tapas', 'Pequeñas porciones para compartir', 10, true
WHERE NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE name = 'Tapas');

-- Enable Row Level Security if not already enabled
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'menu_categories' 
        AND policyname = 'Allow all operations on menu_categories'
    ) THEN
        ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow all operations on menu_categories" ON public.menu_categories FOR ALL USING (true);
    END IF;
END $$;

-- Create index for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_menu_categories_active ON public.menu_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_menu_categories_display_order ON public.menu_categories(display_order);

-- Verify the categories were created
SELECT 
    id, 
    name, 
    description, 
    display_order, 
    is_active,
    created_at
FROM public.menu_categories 
ORDER BY display_order, name;
