import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    console.log("[v0] Attempting to fetch simple ratings from database")

    const { data: ratings, error } = await supabase
      .from("simple_ratings")
      .select(`
        *,
        table:tables(table_number, location)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching simple ratings:", error)
      return NextResponse.json({ error: "Error fetching ratings", details: error.message }, { status: 500 })
    }

    console.log(`[v0] Successfully fetched simple ratings: ${ratings?.length || 0}`)

    return NextResponse.json({ ratings: ratings || [] })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const { table_id, order_id, rating } = body

    // Validar datos requeridos
    if (!table_id || !rating) {
      return NextResponse.json({ error: "table_id and rating are required" }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    console.log("[v0] Creating new simple rating:", { table_id, rating })

    const { data: rating_record, error } = await supabase
      .from("simple_ratings")
      .insert([
        {
          table_id,
          order_id: order_id || null,
          rating,
        },
      ])
      .select(`
        *,
        table:tables(table_number, location)
      `)
      .single()

    if (error) {
      console.error("[v0] Error creating simple rating:", error)
      return NextResponse.json({ error: "Error creating rating", details: error.message }, { status: 500 })
    }

    console.log("[v0] Successfully created simple rating:", rating_record.id)

    return NextResponse.json({ rating: rating_record }, { status: 201 })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
