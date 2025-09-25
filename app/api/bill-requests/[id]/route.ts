import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const requestId = Number.parseInt(params.id)
    const { status, payment_method, notes } = body

    console.log("[v0] Updating bill request:", requestId, { status, payment_method })

    const updateData: any = { status }

    if (payment_method) updateData.payment_method = payment_method
    if (notes) updateData.notes = notes

    if (status === "processing") {
      updateData.processed_at = new Date().toISOString()
    } else if (status === "delivered") {
      updateData.delivered_at = new Date().toISOString()
    }

    const { data: billRequest, error } = await supabase
      .from("bill_requests")
      .update(updateData)
      .eq("id", requestId)
      .select(`
        *,
        table:tables(*),
        order:orders(*)
      `)
      .single()

    if (error) {
      console.error("[v0] Error updating bill request:", error)
      return NextResponse.json({ error: "Error updating bill request", details: error.message }, { status: 500 })
    }

    console.log("[v0] Successfully updated bill request:", requestId)

    return NextResponse.json({ request: billRequest })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
