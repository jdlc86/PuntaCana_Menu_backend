import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

// POST - Mark item as featured
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { item_id } = body

    if (!item_id) {
      return NextResponse.json({ error: "item_id is required" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { data: item, error } = await supabase
      .from("menu_items")
      .update({ is_featured: true })
      .eq("id", item_id)
      .select()
      .single()

    if (error) {
      console.error("Error marking item as featured:", error)
      return NextResponse.json({ error: `Error marking item as featured: ${error.message}` }, { status: 500 })
    }

    console.log("[v0] Item marked as featured:", item_id)
    return NextResponse.json({ item })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET - Get all featured items
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    const { data: items, error } = await supabase.from("menu_items").select("*").eq("is_featured", true).order("name")

    if (error) {
      console.error("Error fetching featured items:", error)
      return NextResponse.json({ error: "Error fetching featured items" }, { status: 500 })
    }

    return NextResponse.json({ items: items || [] })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
