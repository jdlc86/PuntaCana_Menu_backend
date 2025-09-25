import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const announcementId = Number.parseInt(params.id)

    console.log("[v0] Updating announcement:", announcementId, body)

    const { data: announcement, error } = await supabase
      .from("announcements")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", announcementId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating announcement:", error)
      return NextResponse.json({ error: "Error updating announcement", details: error.message }, { status: 500 })
    }

    console.log("[v0] Successfully updated announcement:", announcementId)

    return NextResponse.json({ announcement })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()

    const announcementId = Number.parseInt(params.id)

    console.log("[v0] Deleting announcement:", announcementId)

    const { error } = await supabase.from("announcements").delete().eq("id", announcementId)

    if (error) {
      console.error("[v0] Error deleting announcement:", error)
      return NextResponse.json({ error: "Error deleting announcement", details: error.message }, { status: 500 })
    }

    console.log("[v0] Successfully deleted announcement:", announcementId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
