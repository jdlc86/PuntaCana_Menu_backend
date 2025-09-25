import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { is_available } = await request.json()
    const itemId = Number.parseInt(params.id)

    const { data, error } = await supabase.from("menu_items").update({ is_available }).eq("id", itemId).select()

    if (error) {
      console.error("Error updating item availability:", error)
      return NextResponse.json({ error: "Error updating item availability" }, { status: 500 })
    }

    return NextResponse.json({ success: true, item: data[0] })
  } catch (error) {
    console.error("Error in availability API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
