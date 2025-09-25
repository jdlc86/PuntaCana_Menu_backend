// Tipos TypeScript para el sistema de restaurante

export interface Table {
  id: number
  table_number: number
  capacity: number
  status: "available" | "occupied" | "reserved" | "blocked" | "maintenance"
  qr_code: string
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: number
  name: string
  category: string
  price: number
  is_available: boolean
  description?: string
  allergens: string[] // JSON array de alérgenos
  variants: Array<{ name: string; price: number }> // JSON array de variantes
  customizations: Array<{ name: string; type: "free" | "paid"; price?: number }> // JSON array de personalizaciones
  images: Array<{ url: string; is_primary: boolean }> // JSON array de imágenes
  is_featured: boolean // Campo "estrella"
  is_scheduled?: boolean
  schedule_days?: string[]
  start_time?: string
  end_time?: string
  created_at: string
  updated_at: string
}

export interface Order {
  id: number
  table_id?: number
  order_number: string
  customer_name?: string
  customer_phone?: string
  status: "pending" | "confirmed" | "preparing" | "ready" | "served" | "cancelled"
  total_amount: number
  notes?: string
  estimated_ready_time?: string
  created_at: string
  updated_at: string
  table?: Table
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: number
  order_id: number
  menu_item_id: number
  quantity: number
  unit_price: number
  total_price: number
  special_instructions?: string
  status: "pending" | "preparing" | "ready" | "served"
  created_at: string
  updated_at: string
  menu_item?: MenuItem
}

export interface CreateOrderRequest {
  table_id?: number
  customer_name?: string
  customer_phone?: string
  notes?: string
  items: {
    menu_item_id: number
    quantity: number
    special_instructions?: string
  }[]
}

export interface UpdateOrderStatusRequest {
  status: Order["status"]
  estimated_ready_time?: string
}

export interface ExternalOrderRequest {
  order_number: string
  mesa: number | string
  platos: Array<{
    id: number
    name: string
    quantity: number
    price: number
    special_instructions?: string
  }>
  total: number
  customer_name?: string
  customer_phone?: string
  notes?: string
}

export interface ExternalCallRequest {
  mesa: number | string
  tipo: "General" | "Cuenta" | "Asistencia" | "Queja"
  customer_name?: string
  notes?: string
  priority?: "normal" | "urgent"
}

export interface WaiterCall {
  id: number
  table_id: number
  tipo: "General" | "Cuenta"
  status: "Pendiente" | "Atendida"
  notes?: string
  priority?: "normal" | "urgent"
  customer_name?: string
  created_at: string
  updated_at: string
  table?: Table
}
