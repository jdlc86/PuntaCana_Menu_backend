import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

// Tipo para valoraciones externas
interface ExternalRating {
  mesa: string | number // Número de mesa desde la aplicación externa
  rating: number // Valoración de 1-5 estrellas
  order_id?: number // ID del pedido (opcional)
  user_number?: number // Número de usuario (opcional, se asigna automáticamente si no se proporciona)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body: ExternalRating = await request.json()
    const { mesa, rating, order_id, user_number } = body

    console.log("[v0] Received external rating:", { mesa, rating, order_id, user_number })

    // Validar datos requeridos
    if (!mesa || !rating) {
      return NextResponse.json(
        {
          error: "mesa and rating are required",
        },
        { status: 400 },
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        {
          error: "Rating must be between 1 and 5",
        },
        { status: 400 },
      )
    }

    // Buscar la mesa por número
    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id, table_number")
      .eq("table_number", `Mesa: ${mesa}`)
      .single()

    if (tableError || !table) {
      console.error("[v0] Table not found:", mesa, tableError)
      return NextResponse.json(
        {
          error: `Table ${mesa} not found`,
        },
        { status: 404 },
      )
    }

    console.log("[v0] Found table:", table)

    // Crear la valoración
    const ratingData: any = {
      table_id: table.id,
      rating: rating,
    }

    // Agregar campos opcionales si están presentes
    if (order_id) {
      ratingData.order_id = order_id
    }

    if (user_number) {
      ratingData.user_number = user_number
    }

    const { data: newRating, error: ratingError } = await supabase
      .from("simple_ratings")
      .insert([ratingData])
      .select(`
        *,
        table:tables(table_number, location)
      `)
      .single()

    if (ratingError) {
      console.error("[v0] Error creating rating:", ratingError)
      return NextResponse.json(
        {
          error: "Error creating rating",
          details: ratingError.message,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Successfully created external rating:", newRating.id)

    return NextResponse.json(
      {
        success: true,
        rating: newRating,
        message: `Rating created for Mesa: ${mesa}`,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Unexpected error in external ratings:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}

// Endpoint GET para pruebas con datos hardcodeados
export async function GET() {
  try {
    const supabase = createAdminClient()

    // Datos de prueba hardcodeados
    const testRatings = [
      { mesa: 1, rating: 5, user_number: 101 },
      { mesa: 2, rating: 4, user_number: 102 },
      { mesa: 3, rating: 5, user_number: 103 },
      { mesa: 1, rating: 3, user_number: 104 },
    ]

    console.log("[v0] Creating test ratings...")

    const results = []
    for (const testRating of testRatings) {
      // Buscar la mesa
      const { data: table } = await supabase
        .from("tables")
        .select("id")
        .eq("table_number", `Mesa: ${testRating.mesa}`)
        .single()

      if (table) {
        const { data: rating } = await supabase
          .from("simple_ratings")
          .insert([
            {
              table_id: table.id,
              rating: testRating.rating,
              user_number: testRating.user_number,
            },
          ])
          .select(`
            *,
            table:tables(table_number, location)
          `)
          .single()

        if (rating) {
          results.push(rating)
        }
      }
    }

    return NextResponse.json({
      message: "Test ratings created successfully",
      ratings: results,
    })
  } catch (error) {
    console.error("[v0] Error creating test ratings:", error)
    return NextResponse.json(
      {
        error: "Error creating test ratings",
      },
      { status: 500 },
    )
  }
}

// Configurar CORS para aplicaciones externas
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
