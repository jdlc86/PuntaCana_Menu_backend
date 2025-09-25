import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createAdminClient()

    console.log("[v0] Attempting to fetch announcements from database")

    const { data: announcements, error } = await supabase
      .from("announcements")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching announcements:", error)
      return NextResponse.json({ error: "Error fetching announcements", details: error.message }, { status: 500 })
    }

    console.log(`[v0] Successfully fetched announcements: ${announcements?.length || 0}`)

    return NextResponse.json({ announcements: announcements || [] })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const { title, content, type, priority, start_date, end_date, title_translations, content_translations } = body

    console.log("[v0] Creating new announcement:", { title, type, priority })

    const { data: announcement, error } = await supabase
      .from("announcements")
      .insert([
        {
          title,
          content,
          title_translations,
          content_translations,
          type: type || "general",
          priority: priority || 1,
          start_date: start_date || new Date().toISOString(),
          end_date,
          is_active: true,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating announcement:", error)
      return NextResponse.json({ error: "Error creating announcement", details: error.message }, { status: 500 })
    }

    console.log("[v0] Successfully created announcement:", announcement.id)

    return NextResponse.json({ announcement }, { status: 201 })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
