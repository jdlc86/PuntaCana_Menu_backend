-- Datos de ejemplo para el sistema de restaurante

-- Insertar mesas
INSERT INTO tables (table_number, capacity, qr_code) VALUES
(1, 2, 'QR_TABLE_001'),
(2, 4, 'QR_TABLE_002'),
(3, 4, 'QR_TABLE_003'),
(4, 6, 'QR_TABLE_004'),
(5, 2, 'QR_TABLE_005'),
(6, 8, 'QR_TABLE_006');

-- Eliminada inserción de categorías - ahora usamos nombres directos

-- Insertar elementos del menú
INSERT INTO menu_items (category, name, description, price, preparation_time, is_vegetarian, is_vegan, display_order) VALUES
-- Entradas
('Entrante', 'Bruschetta Italiana', 'Pan tostado con tomate fresco, albahaca y mozzarella', 8.50, 10, true, false, 1),
('Entrante', 'Calamares a la Romana', 'Anillos de calamar rebozados con salsa alioli', 12.00, 15, false, false, 2),
('Entrante', 'Hummus con Crudités', 'Hummus casero con vegetales frescos', 7.00, 5, true, true, 3),

-- Platos Principales
('Principal', 'Paella Valenciana', 'Arroz con pollo, conejo, judías y azafrán', 18.50, 35, false, false, 1),
('Principal', 'Salmón a la Plancha', 'Con verduras asadas y salsa de limón', 22.00, 20, false, false, 2),
('Principal', 'Risotto de Setas', 'Cremoso risotto con setas variadas', 16.00, 25, true, false, 3),
('Principal', 'Hamburguesa Gourmet', 'Carne angus con queso, bacon y papas fritas', 14.50, 18, false, false, 4),

-- Postres
('Postre', 'Tiramisú', 'Clásico postre italiano con café y mascarpone', 6.50, 5, true, false, 1),
('Postre', 'Tarta de Chocolate', 'Rica tarta con chocolate belga', 7.00, 5, true, false, 2),
('Postre', 'Helado Artesanal', 'Tres bolas de helado de sabores variados', 5.50, 3, true, false, 3),

-- Bebidas
('Bebidas', 'Agua Mineral', 'Agua con o sin gas', 2.50, 1, true, true, 1),
('Bebidas', 'Coca Cola', 'Refresco de cola', 3.00, 1, true, true, 2),
('Bebidas', 'Cerveza Artesanal', 'Cerveza local de barril', 4.50, 2, true, true, 3),
('Bebidas', 'Vino Tinto', 'Copa de vino tinto de la casa', 5.00, 2, true, true, 4),
('Bebidas', 'Mojito', 'Cóctel refrescante con ron y menta', 8.00, 5, true, true, 5),

-- Ensaladas
('Ensalada', 'Ensalada César', 'Lechuga, pollo, parmesano y crutones', 11.00, 10, false, false, 1),
('Ensalada', 'Ensalada Griega', 'Tomate, pepino, aceitunas y queso feta', 9.50, 8, true, false, 2),
('Ensalada', 'Ensalada Vegana', 'Mix de hojas verdes con quinoa y aguacate', 10.00, 8, true, true, 3);
