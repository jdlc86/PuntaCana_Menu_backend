import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

// Function to validate if an alert should be shown based on scheduling
function isAlertScheduledToShow(announcement: any): boolean {
  // If it's not an alert type, always show (no scheduling restrictions)
  if (announcement.type !== "alert") {
    return true
  }

  // If no scheduling is configured, show the alert
  if (!announcement.alert_days && !announcement.alert_time) {
    return true
  }

  const now = new Date()

  // Check day scheduling
  if (announcement.alert_days && Array.isArray(announcement.alert_days)) {
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    const currentDayName = dayNames[currentDay]

    // If alert_days is specified but current day is not included, don't show
    if (!announcement.alert_days.includes(currentDayName)) {
      return false
    }
  }

  // Check time scheduling
  if (announcement.alert_time) {
    const currentTime = now.toTimeString().slice(0, 5) // Format: "HH:MM"
    const alertTime = announcement.alert_time.slice(0, 5) // Ensure same format

    // For alerts, we can be more flexible with time matching
    // Show alert if current time is within 30 minutes of scheduled time
    const currentMinutes = Number.parseInt(currentTime.split(":")[0]) * 60 + Number.parseInt(currentTime.split(":")[1])
    const alertMinutes = Number.parseInt(alertTime.split(":")[0]) * 60 + Number.parseInt(alertTime.split(":")[1])
    const timeDifference = Math.abs(currentMinutes - alertMinutes)

    // Show alert if within 30 minutes of scheduled time
    if (timeDifference > 30) {
      return false
    }
  }

  return true
}

// GET - Endpoint público para anuncios en la aplicación de carta del cliente
export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Fetching public announcements for external carta application")

    const { searchParams } = new URL(request.url)
    const language = searchParams.get("lang") || "es" // Soporte para idiomas
    const type = searchParams.get("type") // Filtrar por tipo específico
    const activeOnly = searchParams.get("active_only") !== "false" // Por defecto solo activos

    const supabase = createServerSupabaseClient()

    // Construir query base
    let query = supabase.from("announcements").select("*")

    // Filtrar solo anuncios activos si se solicita
    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    // Filtrar por tipo si se especifica
    if (type) {
      query = query.eq("type", type)
    }

    // Filtrar por fechas válidas
    const now = new Date().toISOString()
    query = query.or(`start_date.is.null,start_date.lte.${now}`).or(`end_date.is.null,end_date.gte.${now}`)

    // Ordenar por prioridad y fecha
    query = query.order("priority", { ascending: false }).order("created_at", { ascending: false })

    const { data: announcements, error } = await query

    if (error) {
      console.error("Error fetching public announcements:", error)
      return NextResponse.json({ error: "Error fetching announcements" }, { status: 500 })
    }

    const scheduledAnnouncements = announcements?.filter(isAlertScheduledToShow) || []

    // Preparar anuncios para respuesta externa
    const publicAnnouncements =
      scheduledAnnouncements?.map((announcement) => {
        // Manejar traducciones si están disponibles
        let title = announcement.title
        let content = announcement.content

        if (language !== "es" && announcement.title_translations) {
          try {
            const titleTranslations = JSON.parse(announcement.title_translations)
            title = titleTranslations[language] || announcement.title
          } catch (e) {
            // Usar título original si hay error en traducción
          }
        }

        if (language !== "es" && announcement.content_translations) {
          try {
            const contentTranslations = JSON.parse(announcement.content_translations)
            content = contentTranslations[language] || announcement.content
          } catch (e) {
            // Usar contenido original si hay error en traducción
          }
        }

        return {
          id: announcement.id,
          title,
          content,
          type: announcement.type || "general",
          priority: announcement.priority || 1,
          start_date: announcement.start_date,
          end_date: announcement.end_date,
          created_at: announcement.created_at,
          alert_days: announcement.alert_days, // Array de días de la semana para alertas
          alert_time: announcement.alert_time, // Hora específica para alertas
          // No incluir campos internos como is_active, translations, etc.
        }
      }) || []

    // Agrupar por tipo para mejor organización
    const groupedByType: Record<string, any[]> = {}
    publicAnnouncements.forEach((announcement) => {
      const announcementType = announcement.type
      if (!groupedByType[announcementType]) {
        groupedByType[announcementType] = []
      }
      groupedByType[announcementType].push(announcement)
    })

    const response = {
      success: true,
      announcements: publicAnnouncements,
      grouped_by_type: groupedByType,
      metadata: {
        total_count: publicAnnouncements.length,
        total_before_scheduling: announcements?.length || 0,
        filtered_by_scheduling: (announcements?.length || 0) - publicAnnouncements.length,
        language,
        filter_type: type || "all",
        active_only: activeOnly,
        last_updated: new Date().toISOString(),
        api_version: "1.0",
      },
    }

    console.log(
      `[v0] Public announcements fetched successfully: ${publicAnnouncements.length} announcements (${response.metadata.filtered_by_scheduling} filtered by scheduling)`,
    )

    // Headers para cacheo y CORS
    const headers = {
      "Cache-Control": "public, max-age=180, s-maxage=300", // Cache 3min cliente, 5min CDN (más frecuente que menú)
      "Access-Control-Allow-Origin": "*", // Permitir acceso desde aplicación externa
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }

    return NextResponse.json(response, { headers })
  } catch (error) {
    console.error("Unexpected error fetching public announcements:", error)
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
