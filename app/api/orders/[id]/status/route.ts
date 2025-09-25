import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

// PUT - Actualizar solo el estado del pedido (endpoint simplificado)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { status } = body

    if (!status || !["pending", "confirmed", "preparing", "ready", "served", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Valid status is required" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Calcular tiempo estimado basado en el estado
    let estimated_ready_time = null
    if (status === "confirmed") {
      // Obtener tiempo de preparación promedio de los elementos del pedido
      const { data: orderItems } = await supabase
        .from("order_items")
        .select(`
          menu_item:menu_items(preparation_time)
        `)
        .eq("order_id", params.id)

      if (orderItems && orderItems.length > 0) {
        const maxPrepTime = Math.max(...orderItems.map((item) => item.menu_item?.preparation_time || 15))
        estimated_ready_time = new Date(Date.now() + maxPrepTime * 60000).toISOString()
      }
    }

    const updateData: any = { status }
    if (estimated_ready_time) {
      updateData.estimated_ready_time = estimated_ready_time
    }

    const { data: order, error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating order status:", error)
      return NextResponse.json({ error: "Error updating order status" }, { status: 500 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
