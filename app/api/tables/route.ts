import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

// GET - Obtener todas las mesas
export async function GET() {
  try {
    const supabase = createAdminClient()

    console.log("[v0] Attempting to fetch tables from database")

    const { data: tables, error } = await supabase.from("tables").select("*").order("table_number")

    if (error) {
      if (error.message.includes("Could not find the table")) {
        return NextResponse.json(
          {
            error: "Database not initialized. Please run the setup script first.",
            setupUrl: "/api/setup",
            message: "Visit /api/setup for database setup instructions",
          },
          { status: 503 },
        )
      }

      console.error("Error fetching tables:", error)
      return NextResponse.json({ error: `Error fetching tables: ${error.message}` }, { status: 500 })
    }

    console.log("[v0] Successfully fetched tables:", tables?.length || 0)
    return NextResponse.json({ tables })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { number, capacity, location } = body

    if (!number || !capacity) {
      return NextResponse.json({ error: "Table number and capacity are required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: table, error } = await supabase
      .from("tables")
      .insert([
        {
          table_number: number,
          capacity,
          location: location || "Salon principal",
          status: "available",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating table:", error)
      return NextResponse.json({ error: `Error creating table: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ table }, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
