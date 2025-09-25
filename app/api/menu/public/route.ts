import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

function isItemCurrentlyScheduled(item: any): boolean {
  // If item is not scheduled, it's always visible
  if (!item.is_scheduled) {
    return true
  }

  // If scheduled but missing schedule data, hide it for safety
  if (!item.schedule_days || !item.start_time || !item.end_time) {
    return false
  }

  const now = new Date()
  const currentDay = now.toLocaleDateString("es-ES", { weekday: "long" }).toLowerCase()
  const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

  // Check if current day is in scheduled days
  const scheduledDays = item.schedule_days.map((day: string) => day.toLowerCase())
  if (!scheduledDays.includes(currentDay)) {
    return false
  }

  // Check if current time is within scheduled hours
  const startTime = item.start_time
  const endTime = item.end_time

  // Handle time comparison
  if (endTime < startTime) {
    // Crosses midnight (e.g., 22:00 to 02:00)
    return currentTime >= startTime || currentTime <= endTime
  } else {
    // Same day (e.g., 09:00 to 17:00)
    return currentTime >= startTime && currentTime <= endTime
  }
}

// GET - Endpoint público para la aplicación de carta del cliente
export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Fetching public menu for external carta application")

    const { searchParams } = new URL(request.url)
    const includeImages = searchParams.get("images") !== "false" // Por defecto incluir imágenes
    const language = searchParams.get("lang") || "es" // Soporte para idiomas

    const supabase = createServerSupabaseClient()

    const { data: items, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true) // Only available items
      .order("category")
      .order("name")

    if (error) {
      console.error("Error fetching public menu:", error)
      return NextResponse.json({ error: "Error fetching menu" }, { status: 500 })
    }

    const visibleItems = items?.filter((item) => isItemCurrentlyScheduled(item)) || []

    console.log(
      `[v0] Filtered ${items?.length || 0} available items to ${visibleItems.length} visible items based on scheduling`,
    )

    // Agrupar por categorías
    const categorizedMenu: Record<string, any[]> = {}
    const featuredItems: any[] = []

    visibleItems.forEach((item) => {
      // Preparar item para respuesta externa
      const publicItem = {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        allergens: item.allergens || [],
        variants: item.variants || [],
        customizations: item.customizations || [],
        is_featured: item.is_featured,
        preparation_time: item.preparation_time,
        scheduling: {
          is_scheduled: item.is_scheduled || false,
          schedule_days: item.schedule_days || [],
          start_time: item.start_time || null,
          end_time: item.end_time || null,
          currently_available: true, // Since we already filtered, all items are currently available
        },
        // Información dietética
        dietary_info: {
          is_vegetarian: item.is_vegetarian,
          is_vegan: item.is_vegan,
          is_gluten_free: item.is_gluten_free,
        },
        // Solo imagen principal por defecto para mejor rendimiento
        image:
          includeImages && item.images?.length > 0
            ? item.images.find((img: any) => img.is_primary)?.url || item.images[0]?.url
            : null,
        // Todas las imágenes si se solicitan explícitamente
        images: includeImages && searchParams.get("all_images") === "true" ? item.images || [] : undefined,
        nutritional_info: item.nutritional_info,
        rating: item.rating || 0,
        review_count: item.review_count || 0,
      }

      // Agregar a categoría
      if (!categorizedMenu[item.category]) {
        categorizedMenu[item.category] = []
      }
      categorizedMenu[item.category].push(publicItem)

      // Agregar a destacados si aplica
      if (item.is_featured) {
        featuredItems.push(publicItem)
      }
    })

    // Convertir a array de categorías
    const categories = Object.entries(categorizedMenu).map(([name, items]) => ({
      name,
      items,
      count: items.length,
    }))

    const response = {
      success: true,
      menu: {
        categories,
        featured_items: featuredItems,
        total_items: visibleItems.length,
        total_categories: categories.length,
      },
      metadata: {
        last_updated: new Date().toISOString(),
        language,
        includes_images: includeImages,
        api_version: "1.0",
        filtering: {
          total_available_items: items?.length || 0,
          visible_after_scheduling: visibleItems.length,
          current_time: new Date().toISOString(),
        },
      },
    }

    console.log(
      `[v0] Public menu fetched successfully: ${visibleItems.length} visible items in ${categories.length} categories`,
    )

    // Headers para cacheo y CORS
    const headers = {
      "Cache-Control": "public, max-age=300, s-maxage=600", // Cache 5min cliente, 10min CDN
      "Access-Control-Allow-Origin": "*", // Permitir acceso desde aplicación externa
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }

    return NextResponse.json(response, { headers })
  } catch (error) {
    console.error("Unexpected error fetching public menu:", error)
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
