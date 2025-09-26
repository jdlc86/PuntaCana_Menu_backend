import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // 1) Autorización del cron por header
  const auth = request.headers.get("authorization") || request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 2) Aquí irá la lógica real de despacho de alertas (cuando la añadas)
  //    De momento devolvemos OK para probar el cron.
  return NextResponse.json({ ok: true, source: "cron" });
}
