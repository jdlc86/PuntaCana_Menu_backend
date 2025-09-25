import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import type { UpdateOrderStatusRequest } from "@/lib/types"

// GET - Obtener pedido específico
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        *,
        table:tables(*),
        order_items(
          *,
          menu_item:menu_items(*)
        )
      `)
      .eq("id", params.id)
      .single()

    if (error) {
      console.error("Error fetching order:", error)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Actualizar estado del pedido
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body: UpdateOrderStatusRequest = await request.json()
    const { status, estimated_ready_time } = body

    if (!status || !["pending", "confirmed", "preparing", "ready", "served", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Valid status is required" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const updateData: any = { status }
    if (estimated_ready_time) {
      updateData.estimated_ready_time = estimated_ready_time
    }

    const { data: order, error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", params.id)
      .select(`
        *,
        table:tables(*),
        order_items(
          *,
          menu_item:menu_items(*)
        )
      `)
      .single()

    if (error) {
      console.error("Error updating order:", error)
      return NextResponse.json({ error: "Error updating order" }, { status: 500 })
    }

    // Si el pedido se marca como servido, liberar la mesa
    if (status === "served" && order.table_id) {
      await supabase.from("tables").update({ status: "available" }).eq("id", order.table_id)
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
