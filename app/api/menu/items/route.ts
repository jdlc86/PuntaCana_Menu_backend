import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

// GET - Obtener elementos del menú
export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Attempting to fetch menu items from database")

    const { searchParams } = new URL(request.url)
    const categoryName = searchParams.get("category") // Cambiar de category_id a category
    const available = searchParams.get("available")
    const search = searchParams.get("search")

    const supabase = createServerSupabaseClient()

    let query = supabase
      .from("menu_items")
      .select("*") // Eliminar join con menu_categories ya que usamos category directamente
      .order("name")

    if (categoryName) {
      query = query.eq("category", categoryName) // Filtrar por nombre de categoría
    }

    if (available === "true") {
      query = query.eq("is_available", true)
    }

    if (search) {
      query = query.ilike("name", `%${search}%`)
    }

    const { data: items, error } = await query

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

      console.error("Error fetching menu items:", error)
      return NextResponse.json({ error: "Error fetching menu items" }, { status: 500 })
    }

    console.log(`[v0] Successfully fetched menu items: ${items?.length || 0}`)
    return NextResponse.json({ items: items || [] })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Crear nuevo elemento del menú
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      price,
      category,
      category_custom,
      is_available,
      is_featured, // Added is_featured field
      is_vegetarian,
      is_vegan,
      is_gluten_free,
      allergens,
      variants,
      customizations,
      images,
      nutritional_info,
      is_scheduled,
      schedule_days,
      start_time,
      end_time,
    } = body

    if (!name || !price) {
      return NextResponse.json(
        {
          error: "Name and price are required",
        },
        { status: 400 },
      )
    }

    const supabase = createServerSupabaseClient()

    const finalCategory = category === "Otras" ? category_custom : category || "Otras"

    const allImages = images || []

    console.log("[v0] Creating menu item with data:", { name, category: finalCategory, images: allImages.length })

    const { data: item, error } = await supabase
      .from("menu_items")
      .insert([
        {
          name,
          description,
          price: Number.parseFloat(price),
          category: finalCategory,
          is_available: is_available !== false,
          is_featured: !!is_featured, // Added is_featured field
          is_vegetarian: !!is_vegetarian,
          is_vegan: !!is_vegan,
          is_gluten_free: !!is_gluten_free,
          allergens: allergens || [], // JSON array
          variants: variants || [], // JSON array
          customizations: customizations || [], // JSON array
          images: allImages, // JSON array
          nutritional_info: nutritional_info || null,
          is_scheduled: !!is_scheduled,
          schedule_days: is_scheduled ? schedule_days || [] : null,
          start_time: is_scheduled ? start_time : null,
          end_time: is_scheduled ? end_time : null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating menu item:", error)
      return NextResponse.json({ error: `Error creating menu item: ${error.message}` }, { status: 500 })
    }

    console.log("[v0] Menu item created successfully:", { item })
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Actualizar elemento del menú
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      name,
      description,
      price,
      category,
      category_custom,
      is_available,
      is_featured, // Added is_featured field
      is_vegetarian,
      is_vegan,
      is_gluten_free,
      allergens,
      variants,
      customizations,
      images,
      nutritional_info,
      is_scheduled,
      schedule_days,
      start_time,
      end_time,
    } = body

    if (!id || !name || !price) {
      return NextResponse.json(
        {
          error: "ID, name and price are required",
        },
        { status: 400 },
      )
    }

    const supabase = createServerSupabaseClient()

    const finalCategory = category === "Otras" ? category_custom : category || "Otras"

    const allImages = images || []

    const { data: item, error } = await supabase
      .from("menu_items")
      .update({
        name,
        description,
        price: Number.parseFloat(price),
        category: finalCategory,
        is_available: is_available !== false,
        is_featured: !!is_featured, // Added is_featured field
        is_vegetarian: !!is_vegetarian,
        is_vegan: !!is_vegan,
        is_gluten_free: !!is_gluten_free,
        allergens: allergens || [], // JSON array
        variants: variants || [], // JSON array
        customizations: customizations || [], // JSON array
        images: allImages, // JSON array
        nutritional_info: nutritional_info || null,
        is_scheduled: !!is_scheduled,
        schedule_days: is_scheduled ? schedule_days || [] : null,
        start_time: is_scheduled ? start_time : null,
        end_time: is_scheduled ? end_time : null,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating menu item:", error)
      return NextResponse.json({ error: `Error updating menu item: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Eliminar elemento del menú
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        {
          error: "ID is required",
        },
        { status: 400 },
      )
    }

    console.log("[v0] Attempting to delete menu item with ID:", id)

    const supabase = createServerSupabaseClient()

    const { error } = await supabase.from("menu_items").delete().eq("id", id)

    if (error) {
      console.error("Error deleting menu item:", error)
      return NextResponse.json({ error: `Error deleting menu item: ${error.message}` }, { status: 500 })
    }

    console.log("[v0] Menu item deleted successfully from database")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
