import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createAdminClient()

    console.log("[v0] Attempting to fetch simple rating statistics from database")

    // Obtener todas las valoraciones
    const { data: ratings, error } = await supabase.from("simple_ratings").select("rating")

    if (error) {
      console.error("[v0] Error fetching simple rating stats:", error)
      return NextResponse.json({ error: "Error fetching rating stats", details: error.message }, { status: 500 })
    }

    const totalRatings = ratings?.length || 0

    if (totalRatings === 0) {
      return NextResponse.json({
        stats: {
          total_ratings: 0,
          average_rating: 0,
          rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      })
    }

    // Calcular promedio general
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings

    // Distribución de calificaciones
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    ratings.forEach((rating) => {
      ratingDistribution[rating.rating as keyof typeof ratingDistribution]++
    })

    console.log(`[v0] Successfully calculated simple rating stats for ${totalRatings} ratings`)

    return NextResponse.json({
      stats: {
        total_ratings: totalRatings,
        average_rating: Math.round(averageRating * 10) / 10,
        rating_distribution: ratingDistribution,
      },
    })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
