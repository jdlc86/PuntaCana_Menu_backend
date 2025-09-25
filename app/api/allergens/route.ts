import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: allergens, error } = await supabase.from("allergens").select("*").order("name")

    if (error) {
      console.error("Error fetching allergens:", error)
      return NextResponse.json({ error: "Error fetching allergens" }, { status: 500 })
    }

    return NextResponse.json(allergens)
  } catch (error) {
    console.error("Error in allergens API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
