import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

// GET - Obtener mesa específica
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: table, error } = await supabase.from("tables").select("*").eq("id", params.id).single()

    if (error) {
      console.error("Error fetching table:", error)
      return NextResponse.json({ error: "Table not found" }, { status: 404 })
    }

    return NextResponse.json({ table })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Actualizar estado de mesa
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { status } = body

    console.log(`[v0] Attempting to update table ${params.id} with status: ${status}`)

    if (!status || !["available", "occupied", "reserved", "maintenance", "blocked"].includes(status)) {
      console.log(`[v0] Invalid status provided: ${status}`)
      return NextResponse.json({ error: "Valid status is required" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    console.log(`[v0] Updating table ${params.id} in database with status: ${status}`)

    const { data: table, error } = await supabase
      .from("tables")
      .update({ status })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating table:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      return NextResponse.json({ error: "Error updating table" }, { status: 500 })
    }

    console.log(`[v0] Successfully updated table ${params.id}`)
    return NextResponse.json({ table })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Eliminar mesa específica
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient()

    // First check if table exists
    const { data: existingTable, error: fetchError } = await supabase
      .from("tables")
      .select("*")
      .eq("id", params.id)
      .single()

    if (fetchError || !existingTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 })
    }

    // Delete the table from database
    const { error: deleteError } = await supabase.from("tables").delete().eq("id", params.id)

    if (deleteError) {
      console.error("Error deleting table:", deleteError)
      return NextResponse.json({ error: "Error deleting table" }, { status: 500 })
    }

    return NextResponse.json({ message: "Table deleted successfully" })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
