-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  category_custom VARCHAR(100),
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMP WITH TIME ZONE,
  preparation_time INTEGER DEFAULT 15,
  allergens TEXT[] DEFAULT '{}',
  variants JSONB DEFAULT '[]',
  customizations JSONB DEFAULT '[]',
  images TEXT[] DEFAULT '{}',
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_gluten_free BOOLEAN DEFAULT false,
  is_vegan BOOLEAN DEFAULT false,
  is_vegetarian BOOLEAN DEFAULT false,
  nutritional_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tables table
CREATE TABLE IF NOT EXISTS public.tables (
  id SERIAL PRIMARY KEY,
  table_number INTEGER NOT NULL UNIQUE,
  capacity INTEGER NOT NULL,
  is_available BOOLEAN DEFAULT true,
  location VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id SERIAL PRIMARY KEY,
  table_id INTEGER REFERENCES public.tables(id),
  items JSONB NOT NULL DEFAULT '[]',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  special_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create waiter_calls table
CREATE TABLE IF NOT EXISTS public.waiter_calls (
  id SERIAL PRIMARY KEY,
  table_id INTEGER REFERENCES public.tables(id),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create bill_requests table
CREATE TABLE IF NOT EXISTS public.bill_requests (
  id SERIAL PRIMARY KEY,
  table_id INTEGER REFERENCES public.tables(id),
  order_id INTEGER REFERENCES public.orders(id),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER REFERENCES public.menu_items(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  customer_name VARCHAR(100),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (restaurant customers)
CREATE POLICY "Allow public read access to categories" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Allow public read access to menu_items" ON public.menu_items FOR SELECT USING (is_available = true);
CREATE POLICY "Allow public read access to tables" ON public.tables FOR SELECT USING (is_available = true);
CREATE POLICY "Allow public read access to announcements" ON public.announcements FOR SELECT USING (is_active = true);
CREATE POLICY "Allow public read access to public reviews" ON public.reviews FOR SELECT USING (is_public = true);

-- Create policies for public insert access (customers can create orders, calls, etc.)
CREATE POLICY "Allow public insert to orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert to waiter_calls" ON public.waiter_calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert to bill_requests" ON public.bill_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert to reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- Create policies for full admin access (for admin panel)
CREATE POLICY "Allow all operations for admin" ON public.categories FOR ALL USING (true);
CREATE POLICY "Allow all operations for admin on menu_items" ON public.menu_items FOR ALL USING (true);
CREATE POLICY "Allow all operations for admin on tables" ON public.tables FOR ALL USING (true);
CREATE POLICY "Allow all operations for admin on orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow all operations for admin on waiter_calls" ON public.waiter_calls FOR ALL USING (true);
CREATE POLICY "Allow all operations for admin on bill_requests" ON public.bill_requests FOR ALL USING (true);
CREATE POLICY "Allow all operations for admin on reviews" ON public.reviews FOR ALL USING (true);
CREATE POLICY "Allow all operations for admin on announcements" ON public.announcements FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_featured ON public.menu_items(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_table_id ON public.waiter_calls(table_id);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_status ON public.waiter_calls(status);
CREATE INDEX IF NOT EXISTS idx_reviews_menu_item_id ON public.reviews(menu_item_id);
