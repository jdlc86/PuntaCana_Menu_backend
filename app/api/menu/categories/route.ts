import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

// GET - Obtener todas las categorías disponibles para la aplicación externa
export async function GET() {
  try {
    console.log("[v0] Fetching available categories for external application")

    const supabase = createServerSupabaseClient()

    // Obtener categorías únicas de platos disponibles
    const { data: items, error } = await supabase.from("menu_items").select("category").eq("is_available", true)

    if (error) {
      console.error("Error fetching categories:", error)
      return NextResponse.json({ error: "Error fetching categories" }, { status: 500 })
    }

    // Contar platos por categoría
    const categoryCount: Record<string, number> = {}
    items?.forEach((item) => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1
    })

    // Convertir a array con información adicional
    const categories = Object.entries(categoryCount).map(([name, count]) => ({
      name,
      count,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
    }))

    const response = {
      success: true,
      categories,
      total_categories: categories.length,
      last_updated: new Date().toISOString(),
    }

    console.log(`[v0] Categories fetched successfully: ${categories.length} categories`)

    // Headers para cacheo y CORS
    const headers = {
      "Cache-Control": "public, max-age=600, s-maxage=1200", // Cache más largo para categorías
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }

    return NextResponse.json(response, { headers })
  } catch (error) {
    console.error("Unexpected error fetching categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// OPTIONS - Para CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
