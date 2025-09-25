-- Execute the comprehensive database creation script
-- This will create all tables including waiter_calls and tables with proper relationships

-- Run the create-all-tables.sql script
\i create-all-tables.sql;

-- Verify tables were created
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
