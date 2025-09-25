import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

// Interfaz para pedidos externos
interface ExternalOrderRequest {
  order_number: string
  mesa: number | string // Puede ser número de mesa o identificador
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

// POST - Recibir pedido desde aplicación externa
export async function POST(request: NextRequest) {
  try {
    const body: ExternalOrderRequest = await request.json()
    const { order_number, mesa, platos, total, customer_name, customer_phone, notes } = body

    console.log("[v0] Received external order:", { order_number, mesa, platos: platos.length, total })

    if (!order_number || !platos || platos.length === 0 || !total) {
      return NextResponse.json(
        {
          error: "order_number, platos, and total are required",
        },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    // Buscar la mesa por número
    let table_id = null
    if (mesa) {
      const { data: table } = await supabase.from("tables").select("id").eq("table_number", mesa).single()

      table_id = table?.id || null
    }

    // Crear el pedido principal
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          table_id,
          order_number,
          customer_name,
          customer_phone,
          notes,
          total_amount: total,
          status: "pending",
        },
      ])
      .select()
      .single()

    if (orderError) {
      console.error("Error creating external order:", orderError)
      return NextResponse.json({ error: "Error creating order" }, { status: 500 })
    }

    // Crear los elementos del pedido
    const orderItemsData = platos.map((plato) => ({
      order_id: order.id,
      menu_item_id: plato.id,
      quantity: plato.quantity,
      unit_price: plato.price,
      total_price: plato.price * plato.quantity,
      special_instructions: plato.special_instructions,
      status: "pending",
    }))

    const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData)

    if (itemsError) {
      console.error("Error creating external order items:", itemsError)
      return NextResponse.json({ error: "Error creating order items" }, { status: 500 })
    }

    // Actualizar estado de la mesa si existe
    if (table_id) {
      await supabase.from("tables").update({ status: "occupied" }).eq("id", table_id)
    }

    console.log("[v0] External order created successfully:", order.id)

    // Obtener pedido completo con relaciones
    const { data: completeOrder } = await supabase
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

    return NextResponse.json(
      {
        success: true,
        order: completeOrder,
        message: "Order received successfully",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Unexpected error processing external order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET - Endpoint de prueba para generar pedidos hardcodeados
export async function GET() {
  try {
    const supabase = createAdminClient()

    // Datos de prueba hardcodeados
    const testOrders = [
      {
        order_number: `TEST-${Date.now()}-001`,
        mesa: 3,
        platos: [
          {
            id: 1,
            name: "Hamburguesa Clásica",
            quantity: 2,
            price: 12.99,
            special_instructions: "Sin cebolla",
          },
          {
            id: 2,
            name: "Papas Fritas",
            quantity: 1,
            price: 4.99,
          },
        ],
        total: 30.97,
        customer_name: "Cliente de Prueba",
        customer_phone: "+1234567890",
        notes: "Pedido de prueba desde aplicación externa",
      },
      {
        order_number: `TEST-${Date.now()}-002`,
        mesa: 5,
        platos: [
          {
            id: 3,
            name: "Pizza Margherita",
            quantity: 1,
            price: 15.99,
          },
          {
            id: 4,
            name: "Coca Cola",
            quantity: 2,
            price: 2.5,
          },
        ],
        total: 20.99,
        customer_name: "María García",
        notes: "Mesa terraza",
      },
    ]

    const createdOrders = []

    for (const testOrder of testOrders) {
      // Crear cada pedido de prueba
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/orders/external`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testOrder),
        },
      )

      if (response.ok) {
        const result = await response.json()
        createdOrders.push(result.order)
      }
    }

    return NextResponse.json({
      message: "Test orders created successfully",
      orders: createdOrders,
      count: createdOrders.length,
    })
  } catch (error) {
    console.error("Error creating test orders:", error)
    return NextResponse.json({ error: "Error creating test orders" }, { status: 500 })
  }
}
