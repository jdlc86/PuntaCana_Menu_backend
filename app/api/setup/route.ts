export async function GET() {
  const setupInstructions = `
# Database Setup Instructions

Your restaurant ordering system requires database tables to be created in Supabase. 

## Option 1: Run the SQL Script (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the following SQL script:

\`\`\`sql
-- Create tables table
CREATE TABLE IF NOT EXISTS public.tables (
  id SERIAL PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  capacity INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create menu_categories table
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  preparation_time INTEGER DEFAULT 15,
  allergens TEXT[],
  nutritional_info JSONB,
  is_vegetarian BOOLEAN DEFAULT false,
  is_vegan BOOLEAN DEFAULT false,
  is_gluten_free BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id SERIAL PRIMARY KEY,
  table_id INTEGER REFERENCES public.tables(id) ON DELETE SET NULL,
  customer_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  special_instructions TEXT,
  estimated_ready_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  special_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for development (allow all operations)
CREATE POLICY "Allow all operations on tables" ON public.tables FOR ALL USING (true);
CREATE POLICY "Allow all operations on menu_categories" ON public.menu_categories FOR ALL USING (true);
CREATE POLICY "Allow all operations on menu_items" ON public.menu_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on order_items" ON public.order_items FOR ALL USING (true);

-- Insert sample data
INSERT INTO public.tables (number, capacity, status) VALUES
  (1, 2, 'available'),
  (2, 4, 'available'),
  (3, 6, 'available'),
  (4, 2, 'available'),
  (5, 4, 'occupied')
ON CONFLICT (number) DO NOTHING;

INSERT INTO public.menu_categories (id, name, description, display_order) VALUES
  (1, 'Appetizers', 'Start your meal right', 1),
  (2, 'Main Courses', 'Hearty and delicious', 2),
  (3, 'Desserts', 'Sweet endings', 3),
  (4, 'Beverages', 'Refreshing drinks', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, category_id, name, description, price, preparation_time, is_vegetarian) VALUES
  (1, 1, 'Caesar Salad', 'Fresh romaine with parmesan', 12.99, 10, true),
  (2, 1, 'Bruschetta', 'Toasted bread with tomatoes', 8.99, 8, true),
  (3, 2, 'Grilled Salmon', 'Fresh Atlantic salmon', 24.99, 20, false),
  (4, 2, 'Ribeye Steak', 'Premium cut, perfectly grilled', 32.99, 25, false),
  (5, 3, 'Chocolate Cake', 'Rich and decadent', 7.99, 5, true),
  (6, 4, 'House Wine', 'Red or white selection', 6.99, 2, false)
ON CONFLICT (id) DO NOTHING;
\`\`\`

4. Click "Run" to execute the script
5. Refresh your application

## Option 2: Use the v0 Script Runner

If you're using v0, you can run the provided SQL script directly from the scripts folder.

After setup is complete, your restaurant ordering system will be fully functional!
  `

  return new Response(setupInstructions, {
    headers: {
      "Content-Type": "text/plain",
    },
  })
}
