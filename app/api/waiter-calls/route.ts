import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createAdminClient()

    console.log("[v0] Attempting to fetch waiter calls from database")

    const { data: calls, error } = await supabase
      .from("waiter_calls")
      .select(`
        *,
        tables(*)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching waiter calls:", error)
      return NextResponse.json({ error: "Error fetching waiter calls", details: error.message }, { status: 500 })
    }

    console.log(`[v0] Successfully fetched waiter calls: ${calls?.length || 0}`)

    return NextResponse.json({ calls: calls || [] })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const { table_id, tipo } = body

    console.log("[v0] Creating new waiter call:", { table_id, tipo })

    const { data: call, error } = await supabase
      .from("waiter_calls")
      .insert([
        {
          table_id,
          tipo: tipo || "General",
          status: "Pendiente", // Corregir status inicial a Pendiente en lugar de Atendida
        },
      ])
      .select(`
        *,
        tables(*)
      `)
      .single()

    if (error) {
      console.error("[v0] Error creating waiter call:", error)
      return NextResponse.json({ error: "Error creating waiter call", details: error.message }, { status: 500 })
    }

    console.log("[v0] Successfully created waiter call:", call.id)

    return NextResponse.json({ call }, { status: 201 })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
