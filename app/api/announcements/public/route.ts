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


        /*****/
      // Parámetros
      const { searchParams } = new URL(request.url)
      const language = searchParams.get("lang") || "es"
      const type = searchParams.get("type")
      const activeOnly = searchParams.get("active_only") !== "false" // ya no se usa con la vista, pero lo preservo por metadata
      const v = searchParams.get("v") // solo para cache-busting en CDN (no se usa en servidor)
      
      const supabase = createServerSupabaseClient()
      
      // 1) Leer versión/meta ANTES de armar respuesta y headers
      const { data: meta, error: metaErr } = await supabase
        .from("announcements_meta")
        .select("version, updated_at")
        .eq("id", 1)
        .single()
      const version = meta?.version ?? 1
      
      // 2) Leer desde la VISTA (ya filtra activos/fechas/ventanas)
      let query = supabase.from("announcements_visible_now").select("*")
      if (type) {
        query = query.eq("type", type)
      }
      
      const { data: announcements, error } = await query
      if (error) {
        console.error("Error fetching public announcements:", error)
        return NextResponse.json({ error: "Error fetching announcements" }, { status: 500 })
      }
      
      // 3) Filtro de ventana de alerta (si sigues usando esta lógica en cliente)
      const scheduledAnnouncements = announcements?.filter(isAlertScheduledToShow) || []
      
      // 4) Mapear a payload público
      const publicAnnouncements =
        scheduledAnnouncements?.map((a) => {
          // Traducciones
          let title = a.title
          let content = a.content
          if (language !== "es" && a.title_translations) {
            try {
              const tt = typeof a.title_translations === "string" ? JSON.parse(a.title_translations) : a.title_translations
              title = tt?.[language] || a.title
            } catch {}
          }
          if (language !== "es" && a.content_translations) {
            try {
              const ct = typeof a.content_translations === "string" ? JSON.parse(a.content_translations) : a.content_translations
              content = ct?.[language] || a.content
            } catch {}
          }
      
          // Tu esquema usa schedule_days/start_time: expónlos con los nombres que espera la carta
          return {
            id: a.id,
            title,
            content,
            type: a.type || "general",
            priority: a.priority || 1,
            start_date: a.start_date,
            end_date: a.end_date,
            created_at: a.created_at,
            alert_days: a.alert_days ?? a.schedule_days ?? null,   // <- adapta nombres
            alert_time: a.alert_time ?? (a.start_time ? String(a.start_time).slice(0, 5) : null), // HH:MM
          }
        }) || []
      
      // 5) Agrupar por tipo (igual que antes)
      const groupedByType: Record<string, any[]> = {}
      publicAnnouncements.forEach((ann) => {
        const t = ann.type
        if (!groupedByType[t]) groupedByType[t] = []
        groupedByType[t].push(ann)
      })
      
      // 6) Respuesta con version en metadata
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
          last_updated: meta?.updated_at ?? new Date().toISOString(),
          api_version: "1.0",
          version, // 👈 NUEVO
        },
      }
      
      // 7) Headers de caché + CORS + revalidación condicional
      const headers = {
        "Cache-Control": "public, max-age=180, s-maxage=300, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Last-Modified": (meta?.updated_at ?? new Date().toISOString()),
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
