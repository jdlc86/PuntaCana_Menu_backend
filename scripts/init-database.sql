-- Creating comprehensive database initialization script
-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.menu_categories CASCADE;
DROP TABLE IF EXISTS public.tables CASCADE;

-- Create tables table
CREATE TABLE public.tables (
    id SERIAL PRIMARY KEY,
    table_number INTEGER NOT NULL UNIQUE,
    capacity INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create menu_categories table
CREATE TABLE public.menu_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    preparation_time INTEGER DEFAULT 15,
    allergens TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE public.orders (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES public.tables(id) ON DELETE CASCADE,
    customer_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled')),
    total_amount DECIMAL(10,2) DEFAULT 0,
    estimated_ready_time TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE public.order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES public.menu_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data
INSERT INTO public.tables (table_number, capacity, status) VALUES
(1, 2, 'available'),
(2, 4, 'available'),
(3, 6, 'occupied'),
(4, 2, 'available'),
(5, 8, 'reserved');

INSERT INTO public.menu_categories (name, description, display_order) VALUES
('Appetizers', 'Start your meal with our delicious appetizers', 1),
('Main Courses', 'Hearty and satisfying main dishes', 2),
('Desserts', 'Sweet treats to end your meal', 3),
('Beverages', 'Refreshing drinks and beverages', 4);

INSERT INTO public.menu_items (category_id, name, description, price, preparation_time, is_available) VALUES
(1, 'Caesar Salad', 'Fresh romaine lettuce with caesar dressing and croutons', 12.99, 10, true),
(1, 'Chicken Wings', 'Spicy buffalo wings served with ranch dressing', 14.99, 15, true),
(2, 'Grilled Salmon', 'Fresh Atlantic salmon with lemon herb seasoning', 24.99, 20, true),
(2, 'Beef Burger', 'Juicy beef patty with lettuce, tomato, and fries', 16.99, 18, true),
(2, 'Pasta Carbonara', 'Creamy pasta with bacon and parmesan cheese', 18.99, 15, true),
(3, 'Chocolate Cake', 'Rich chocolate cake with vanilla ice cream', 8.99, 5, true),
(3, 'Tiramisu', 'Classic Italian dessert with coffee and mascarpone', 9.99, 5, true),
(4, 'Coffee', 'Freshly brewed coffee', 3.99, 3, true),
(4, 'Fresh Orange Juice', 'Squeezed orange juice', 4.99, 2, true);

-- Insert sample orders
INSERT INTO public.orders (table_id, customer_name, status, total_amount, notes) VALUES
(3, 'John Doe', 'preparing', 41.97, 'No onions on the burger'),
(5, 'Jane Smith', 'pending', 27.98, 'Extra sauce on the side');

-- Insert sample order items
INSERT INTO public.order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
(1, 4, 1, 16.99, 16.99),
(1, 2, 1, 14.99, 14.99),
(1, 8, 2, 3.99, 7.98),
(2, 3, 1, 24.99, 24.99),
(2, 8, 1, 3.99, 3.99);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for development)
CREATE POLICY "Allow all operations on tables" ON public.tables FOR ALL USING (true);
CREATE POLICY "Allow all operations on menu_categories" ON public.menu_categories FOR ALL USING (true);
CREATE POLICY "Allow all operations on menu_items" ON public.menu_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on order_items" ON public.order_items FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX idx_orders_table_id ON public.orders(table_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON public.order_items(menu_item_id);
