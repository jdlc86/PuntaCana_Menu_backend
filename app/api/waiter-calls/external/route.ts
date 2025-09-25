import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

// Interfaz para llamadas externas
interface ExternalCallRequest {
  mesa: number | string // Número de mesa o identificador
  tipo: "General" | "Cuenta" | "Asistencia" | "Queja"
  customer_name?: string
  notes?: string
  priority?: "normal" | "urgent"
}

// POST - Recibir llamada desde aplicación externa
export async function POST(request: NextRequest) {
  try {
    const body: ExternalCallRequest = await request.json()
    const { mesa, tipo, customer_name, notes, priority } = body

    console.log("[v0] Received external call:", { mesa, tipo, customer_name, priority })

    if (!mesa || !tipo) {
      return NextResponse.json(
        {
          error: "mesa and tipo are required",
        },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    // Buscar la mesa por número
    let table_id = null
    if (mesa) {
      const { data: table } = await supabase.from("tables").select("id").eq("table_number", mesa).single()

      table_id = table?.id || null

      if (!table_id) {
        return NextResponse.json(
          {
            error: `Table ${mesa} not found`,
          },
          { status: 404 },
        )
      }
    }

    // Crear la llamada
    const { data: call, error: callError } = await supabase
      .from("waiter_calls")
      .insert([
        {
          table_id,
          tipo: tipo === "Cuenta" ? "Cuenta" : "General", // Mapear tipos válidos
          status: "Pendiente", // Corregir status inicial a Pendiente
          notes,
          priority,
          customer_name,
        },
      ])
      .select(`
        *,
        table:tables(*)
      `)
      .single()

    if (callError) {
      console.error("Error creating external call:", callError)
      return NextResponse.json({ error: "Error creating call" }, { status: 500 })
    }

    console.log("[v0] External call created successfully:", call.id)

    return NextResponse.json(
      {
        success: true,
        call,
        message: "Call received successfully",
      },
      {
        status: 201,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    )
  } catch (error) {
    console.error("Unexpected error processing external call:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET - Endpoint de prueba para generar llamadas hardcodeadas
export async function GET() {
  try {
    const supabase = createAdminClient()

    // Datos de prueba hardcodeados
    const testCalls = [
      {
        mesa: 3,
        tipo: "General" as const,
        customer_name: "Cliente Mesa 3",
        notes: "Solicita más servilletas",
        priority: "normal" as const,
      },
      {
        mesa: 5,
        tipo: "Cuenta" as const,
        customer_name: "María García",
        notes: "Quiere pagar la cuenta",
        priority: "urgent" as const,
      },
      {
        mesa: 7,
        tipo: "General" as const,
        notes: "Pregunta sobre alérgenos en el plato",
        priority: "normal" as const,
      },
    ]

    const createdCalls = []

    for (const testCall of testCalls) {
      // Crear cada llamada de prueba usando el mismo endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/waiter-calls/external`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testCall),
        },
      )

      if (response.ok) {
        const result = await response.json()
        createdCalls.push(result.call)
      }
    }

    return NextResponse.json({
      message: "Test calls created successfully",
      calls: createdCalls,
      count: createdCalls.length,
    })
  } catch (error) {
    console.error("Error creating test calls:", error)
    return NextResponse.json({ error: "Error creating test calls" }, { status: 500 })
  }
}

// OPTIONS - Para CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
