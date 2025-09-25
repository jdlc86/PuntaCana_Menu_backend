import { createAdminClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createAdminClient()

    console.log("[v0] Starting health check...")

    const tables = ["tables", "menu_items", "orders", "order_items"]
    const tableStatus: Record<string, boolean> = {}

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select("count(*)", { count: "exact", head: true })

        if (error) {
          console.log(`[v0] Table ${table} check failed:`, error.message)
          tableStatus[table] = false
        } else {
          console.log(`[v0] Table ${table} exists and accessible`)
          tableStatus[table] = true
        }
      } catch (err) {
        console.log(`[v0] Table ${table} check error:`, err)
        tableStatus[table] = false
      }
    }

    const allTablesExist = Object.values(tableStatus).every((status) => status)

    // Get sample data counts
    const dataCounts: Record<string, number> = {}

    if (allTablesExist) {
      for (const table of tables) {
        try {
          const { count } = await supabase.from(table).select("*", { count: "exact", head: true })

          dataCounts[table] = count || 0
        } catch (err) {
          dataCounts[table] = 0
        }
      }
    }

    return NextResponse.json({
      status: allTablesExist ? "healthy" : "needs_initialization",
      database_connected: true,
      tables: tableStatus,
      data_counts: dataCounts,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Health check failed:", error)
    return NextResponse.json(
      {
        status: "error",
        database_connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
