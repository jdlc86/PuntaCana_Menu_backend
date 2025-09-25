import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const publicOnly = searchParams.get("public") === "true"

    console.log("[v0] Attempting to fetch reviews from database", { publicOnly })

    let query = supabase.from("reviews").select(`
        *,
        table:tables(*),
        order:orders(*)
      `)

    if (publicOnly) {
      query = query.eq("is_public", true)
    }

    const { data: reviews, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching reviews:", error)
      return NextResponse.json({ error: "Error fetching reviews", details: error.message }, { status: 500 })
    }

    console.log(`[v0] Successfully fetched reviews: ${reviews?.length || 0}`)

    return NextResponse.json({ reviews: reviews || [] })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const {
      order_id,
      table_id,
      customer_name,
      rating,
      food_rating,
      service_rating,
      ambiance_rating,
      comment,
      is_public,
    } = body

    console.log("[v0] Creating new review:", { order_id, table_id, rating })

    const { data: review, error } = await supabase
      .from("reviews")
      .insert([
        {
          order_id,
          table_id,
          customer_name: customer_name || "Cliente Anónimo",
          rating,
          food_rating: food_rating || rating,
          service_rating: service_rating || rating,
          ambiance_rating: ambiance_rating || rating,
          comment: comment || null,
          is_public: is_public !== false, // default true
        },
      ])
      .select(`
        *,
        table:tables(*),
        order:orders(*)
      `)
      .single()

    if (error) {
      console.error("[v0] Error creating review:", error)
      return NextResponse.json({ error: "Error creating review", details: error.message }, { status: 500 })
    }

    console.log("[v0] Successfully created review:", review.id)

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
