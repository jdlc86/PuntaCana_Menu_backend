import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

// DELETE - Remove item from featured
export async function DELETE(request: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const itemId = params.itemId

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { data: item, error } = await supabase
      .from("menu_items")
      .update({ is_featured: false })
      .eq("id", itemId)
      .select()
      .single()

    if (error) {
      console.error("Error removing featured status:", error)
      return NextResponse.json({ error: `Error removing featured status: ${error.message}` }, { status: 500 })
    }

    console.log("[v0] Featured status removed from item:", itemId)
    return NextResponse.json({ item })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
