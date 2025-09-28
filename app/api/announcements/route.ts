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
    const {
      title,
      content,
      type,
      priority,
      start_date,
      end_date,
      title_translations,
      content_translations,
      is_scheduled,
      schedule_days,
      start_time,
      end_time,
      repeat_every_minutes, // Added repeat_every_minutes field
    } = body

    console.log("[v0] Creating new announcement:", { title, type, priority, repeat_every_minutes })

    if (type === "alert" && repeat_every_minutes !== null && repeat_every_minutes !== undefined) {
      if (repeat_every_minutes < 10) {
        return NextResponse.json(
          { error: "Validation error", details: "Alert interval must be at least 10 minutes" },
          { status: 400 },
        )
      }
    }

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
          is_scheduled: type === "alert" ? is_scheduled : false,
          schedule_days: type === "alert" ? schedule_days : null,
          start_time: type === "alert" ? start_time : null,
          end_time: type === "alert" ? end_time : null,
          repeat_every_minutes: type === "alert" ? repeat_every_minutes : null, // Added repeat_every_minutes to insert
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

