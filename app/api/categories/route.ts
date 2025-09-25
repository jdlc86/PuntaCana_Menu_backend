import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET() {
  try {
    console.log("[v0] Attempting to fetch categories from database")

    const supabase = createAdminClient()

    const { data: categories, error } = await supabase.from("menu_categories").select("*").order("name")

    if (error) {
      console.error("[v0] Error fetching categories:", error)
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
    }

    console.log(`[v0] Successfully fetched categories: ${categories?.length || 0}`)

    return NextResponse.json({ categories: categories || [] })
  } catch (error) {
    console.error("[v0] Categories API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: category, error } = await supabase
      .from("menu_categories")
      .insert([{ name, description }])
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating category:", error)
      return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
    }

    console.log("[v0] Successfully created category:", category)

    return NextResponse.json({ category })
  } catch (error) {
    console.error("[v0] Categories POST API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
