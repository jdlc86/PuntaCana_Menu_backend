-- Insert default categories
INSERT INTO public.categories (name, description) VALUES
  ('Entrantes', 'Platos para comenzar la comida'),
  ('Principal', 'Platos principales'),
  ('Postres', 'Dulces y postres'),
  ('Bebidas', 'Bebidas frías y calientes')
ON CONFLICT (name) DO NOTHING;

-- Insert sample tables
INSERT INTO public.tables (table_number, capacity, location) VALUES
  (1, 2, 'Terraza'),
  (2, 4, 'Interior'),
  (3, 6, 'Interior'),
  (4, 2, 'Terraza'),
  (5, 8, 'Salón privado')
ON CONFLICT (table_number) DO NOTHING;

-- Insert sample announcements
INSERT INTO public.announcements (title, content, priority) VALUES
  ('¡Bienvenidos!', 'Disfruta de nuestra nueva carta de temporada', 1),
  ('Oferta especial', 'Descuento del 20% en postres los fines de semana', 2),
  ('Horario especial', 'Abierto hasta las 24:00 los viernes y sábados', 3)
ON CONFLICT DO NOTHING;
