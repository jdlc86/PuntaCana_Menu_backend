import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createAdminClient()

    console.log("[v0] Attempting to fetch review statistics from database")

    // Obtener estadísticas generales
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("rating, food_rating, service_rating, ambiance_rating")

    if (error) {
      console.error("[v0] Error fetching review stats:", error)
      return NextResponse.json({ error: "Error fetching review stats", details: error.message }, { status: 500 })
    }

    const totalReviews = reviews?.length || 0

    if (totalReviews === 0) {
      return NextResponse.json({
        stats: {
          total_reviews: 0,
          average_rating: 0,
          average_food_rating: 0,
          average_service_rating: 0,
          average_ambiance_rating: 0,
          rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      })
    }

    // Calcular promedios
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    const averageFoodRating = reviews.reduce((sum, r) => sum + (r.food_rating || r.rating), 0) / totalReviews
    const averageServiceRating = reviews.reduce((sum, r) => sum + (r.service_rating || r.rating), 0) / totalReviews
    const averageAmbianceRating = reviews.reduce((sum, r) => sum + (r.ambiance_rating || r.rating), 0) / totalReviews

    // Distribución de calificaciones
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    reviews.forEach((review) => {
      ratingDistribution[review.rating as keyof typeof ratingDistribution]++
    })

    console.log(`[v0] Successfully calculated review stats for ${totalReviews} reviews`)

    return NextResponse.json({
      stats: {
        total_reviews: totalReviews,
        average_rating: Math.round(averageRating * 10) / 10,
        average_food_rating: Math.round(averageFoodRating * 10) / 10,
        average_service_rating: Math.round(averageServiceRating * 10) / 10,
        average_ambiance_rating: Math.round(averageAmbianceRating * 10) / 10,
        rating_distribution: ratingDistribution,
      },
    })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
