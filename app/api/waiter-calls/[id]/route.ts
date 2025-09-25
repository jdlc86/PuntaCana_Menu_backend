import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const callId = params.id
    const { status } = body

    console.log("[v0] Updating waiter call:", callId, { status })

    const { data: call, error } = await supabase
      .from("waiter_calls")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", callId)
      .select(`
        *,
        table:tables(*)
      `)
      .single()

    if (error) {
      console.error("[v0] Error updating waiter call:", error)
      return NextResponse.json({ error: "Error updating waiter call", details: error.message }, { status: 500 })
    }

    console.log("[v0] Successfully updated waiter call:", callId)

    return NextResponse.json({ call })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const callId = params.id

    console.log("[v0] Deleting waiter call:", callId)

    const { error } = await supabase.from("waiter_calls").delete().eq("id", callId)

    if (error) {
      console.error("[v0] Error deleting waiter call:", error)
      return NextResponse.json({ error: "Error deleting waiter call", details: error.message }, { status: 500 })
    }

    console.log("[v0] Successfully deleted waiter call:", callId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
