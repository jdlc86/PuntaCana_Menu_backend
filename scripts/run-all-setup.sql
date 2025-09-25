-- Complete database setup script
-- This script will create all necessary tables and add scheduling functionality

-- First, create all basic tables
\i scripts/001_create_restaurant_tables.sql

-- Add initial data
\i scripts/002_seed_initial_data.sql

-- Add advanced features including scheduling
\i scripts/10-add-menu-scheduling-fields.sql

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
