-- Create all necessary tables for the restaurant ordering system
-- This script will create the complete database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create categories table (using 'category' as column name as user specified)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert predefined categories
INSERT INTO categories (name, description) VALUES
  ('Appetizers', 'Starters and small plates'),
  ('Main Courses', 'Main dishes and entrees'),
  ('Desserts', 'Sweet treats and desserts'),
  ('Beverages', 'Drinks and beverages')
ON CONFLICT (name) DO NOTHING;

-- Create tables table
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number INTEGER UNIQUE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category UUID REFERENCES categories(id),
  image_url TEXT,
  available BOOLEAN DEFAULT true,
  allergens TEXT[],
  preparation_time INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES tables(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled')),
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  special_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create waiter_calls table
CREATE TABLE IF NOT EXISTS waiter_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES tables(id),
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bill_requests table
CREATE TABLE IF NOT EXISTS bill_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES tables(id),
  order_id UUID REFERENCES orders(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'paid')),
  total_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES tables(id),
  order_id UUID REFERENCES orders(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data
INSERT INTO tables (number, capacity, status) VALUES
  (1, 4, 'available'),
  (2, 2, 'available'),
  (3, 6, 'available'),
  (4, 4, 'occupied'),
  (5, 8, 'available')
ON CONFLICT (number) DO NOTHING;

-- Insert sample announcements
INSERT INTO announcements (title, message, type) VALUES
  ('Welcome!', 'Welcome to our restaurant. Enjoy your meal!', 'info'),
  ('Special Offer', 'Today we have a 20% discount on all desserts!', 'success'),
  ('Kitchen Notice', 'Some items may take longer due to high demand', 'warning')
ON CONFLICT DO NOTHING;

-- Insert sample orders
INSERT INTO orders (table_id, status, total_amount, notes) 
SELECT t.id, 'pending', 25.50, 'No special requests'
FROM tables t WHERE t.number = 4
ON CONFLICT DO NOTHING;

INSERT INTO orders (table_id, status, total_amount, notes)
SELECT t.id, 'served', 45.75, 'Extra spicy'
FROM tables t WHERE t.number = 1
ON CONFLICT DO NOTHING;

-- Insert sample reviews
INSERT INTO reviews (table_id, rating, comment, public)
SELECT t.id, 5, 'Excellent food and service!', true
FROM tables t WHERE t.number = 1
ON CONFLICT DO NOTHING;

INSERT INTO reviews (table_id, rating, comment, public)
SELECT t.id, 4, 'Good food, could be faster', true
FROM tables t WHERE t.number = 4
ON CONFLICT DO NOTHING;
