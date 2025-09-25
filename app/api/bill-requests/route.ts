import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createAdminClient()

    console.log("[v0] Attempting to fetch bill requests from database")

    const { data: requests, error } = await supabase
      .from("bill_requests")
      .select(`
        *,
        table:tables(*),
        order:orders(*)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching bill requests:", error)
      return NextResponse.json({ error: "Error fetching bill requests", details: error.message }, { status: 500 })
    }

    console.log(`[v0] Successfully fetched bill requests: ${requests?.length || 0}`)

    return NextResponse.json({ requests: requests || [] })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const { table_id, order_id, payment_method, notes } = body

    console.log("[v0] Creating new bill request:", { table_id, order_id, payment_method })

    const { data: billRequest, error } = await supabase
      .from("bill_requests")
      .insert([
        {
          table_id,
          order_id,
          payment_method: payment_method || null,
          notes: notes || null,
          status: "pending",
        },
      ])
      .select(`
        *,
        table:tables(*),
        order:orders(*)
      `)
      .single()

    if (error) {
      console.error("[v0] Error creating bill request:", error)
      return NextResponse.json({ error: "Error creating bill request", details: error.message }, { status: 500 })
    }

    console.log("[v0] Successfully created bill request:", billRequest.id)

    return NextResponse.json({ request: billRequest }, { status: 201 })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
