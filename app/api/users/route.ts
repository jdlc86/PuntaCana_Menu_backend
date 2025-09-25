import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET() {
  try {
    console.log("[v0] Attempting to fetch users from database")

    const supabase = createAdminClient()

    // Get users from auth.users table
    const { data: users, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error("[v0] Error fetching users:", error)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    console.log(`[v0] Successfully fetched users: ${users?.users?.length || 0}`)

    // Return simplified user data for admin dashboard
    const simplifiedUsers = users.users.map((user) => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
    }))

    return NextResponse.json({ users: simplifiedUsers })
  } catch (error) {
    console.error("[v0] Users API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
