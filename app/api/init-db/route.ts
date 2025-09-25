import { NextResponse } from "next/server"
import { initializeDatabase } from "@/lib/database-init"

export async function POST() {
  console.log("[v0] Database initialization requested")

  try {
    const result = await initializeDatabase()

    if (result.success) {
      return NextResponse.json({
        message: "Database initialized successfully",
        success: true,
      })
    } else {
      return NextResponse.json(
        {
          message: "Database initialization failed",
          error: result.error,
          success: false,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Database initialization error:", error)
    return NextResponse.json(
      {
        message: "Database initialization failed",
        error: error.message,
        success: false,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to initialize database",
  })
}
