import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import type { CreateOrderRequest } from "@/lib/types"

// GET - Obtener pedidos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const tableId = searchParams.get("table_id")

    const supabase = createAdminClient()

    console.log("[v0] Attempting to fetch orders from database")

    let query = supabase
      .from("orders")
      .select(`
        *,
        table:tables(*),
        order_items(
          *,
          menu_item:menu_items(*)
        )
      `)
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    if (tableId) {
      query = query.eq("table_id", tableId)
    }

    const { data: orders, error } = await query

    if (error) {
      if (error.message.includes("Could not find the table")) {
        return NextResponse.json(
          {
            error: "Database not initialized. Please run the setup script first.",
            setupUrl: "/api/setup",
            message: "Visit /api/setup for database setup instructions",
          },
          { status: 503 },
        )
      }

      console.error("Error fetching orders:", error)
      return NextResponse.json({ error: `Error fetching orders: ${error.message}` }, { status: 500 })
    }

    console.log("[v0] Successfully fetched orders:", orders?.length || 0)
    return NextResponse.json({ orders })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Crear nuevo pedido
export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json()
    const { table_id, customer_name, customer_phone, notes, items } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Order items are required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Generar número de pedido único
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    // Obtener precios de los elementos del menú
    const menuItemIds = items.map((item) => item.menu_item_id)
    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .select("id, price")
      .in("id", menuItemIds)

    if (menuError) {
      console.error("Error fetching menu items:", menuError)
      return NextResponse.json({ error: "Error validating menu items" }, { status: 500 })
    }

    // Calcular total
    let totalAmount = 0
    const orderItemsData = items.map((item) => {
      const menuItem = menuItems.find((mi) => mi.id === item.menu_item_id)
      if (!menuItem) {
        throw new Error(`Menu item ${item.menu_item_id} not found`)
      }

      const itemTotal = menuItem.price * item.quantity
      totalAmount += itemTotal

      return {
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: menuItem.price,
        total_price: itemTotal,
        special_instructions: item.special_instructions,
      }
    })

    // Crear pedido
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          table_id,
          order_number: orderNumber,
          customer_name,
          customer_phone,
          notes,
          total_amount: totalAmount,
        },
      ])
      .select()
      .single()

    if (orderError) {
      console.error("Error creating order:", orderError)
      return NextResponse.json({ error: "Error creating order" }, { status: 500 })
    }

    // Crear elementos del pedido
    const orderItemsWithOrderId = orderItemsData.map((item) => ({
      ...item,
      order_id: order.id,
    }))

    const { error: itemsError } = await supabase.from("order_items").insert(orderItemsWithOrderId)

    if (itemsError) {
      console.error("Error creating order items:", itemsError)
      return NextResponse.json({ error: "Error creating order items" }, { status: 500 })
    }

    // Actualizar estado de la mesa si se especifica
    if (table_id) {
      await supabase.from("tables").update({ status: "occupied" }).eq("id", table_id)
    }

    // Obtener pedido completo con relaciones
    const { data: completeOrder, error: fetchError } = await supabase
      .from("orders")
      .select(`
        *,
        table:tables(*),
        order_items(
          *,
          menu_item:menu_items(*)
        )
      `)
      .eq("id", order.id)
      .single()

    if (fetchError) {
      console.error("Error fetching complete order:", fetchError)
      return NextResponse.json({ error: "Order created but error fetching details" }, { status: 500 })
    }

    return NextResponse.json({ order: completeOrder }, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
