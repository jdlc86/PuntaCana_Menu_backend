export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  // Auth por header o query ?secret=
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("secret");
  const fromHeader = req.headers.get("authorization");
  const okHeader = fromHeader === `Bearer ${process.env.CRON_SECRET}`;
  const okQuery = !!fromQuery && fromQuery === process.env.CRON_SECRET;
  if (!okHeader && !okQuery) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const H = { "Cache-Control": "no-store" as const };
  const now = new Date().toISOString();

  // 1) Buscar alertas "vencidas" por next_run_at (toca enviar)
  const { data: dueAlerts, error: errDue } = await supabase
    .from("announcements")
    .select("*")
    .eq("type", "alert")
    .eq("is_active", true)
    .not("next_run_at", "is", null)
    .lte("next_run_at", now);

  if (errDue) {
    console.error("[dispatch] DB due alerts error:", errDue);
    return NextResponse.json({ error: "db_error_due" }, { status: 500, headers: H });
  }

  if (!dueAlerts || dueAlerts.length === 0) {
    return NextResponse.json({ ok: true, due: 0, sent: 0, skipped: 0 }, { headers: H });
  }

  // 2) Traer suscripciones activas una sola vez
  const { data: subs, error: errSubs } = await supabase
    .from("push_subscriptions")
    .select("endpoint,auth,p256dh")
    .is("revoked_at", null);

  if (errSubs) {
    console.error("[dispatch] DB subs error:", errSubs);
    return NextResponse.json({ error: "db_error_subs" }, { status: 500, headers: H });
  }

  const targets = subs?.length ?? 0;
  if (targets === 0) {
    // Reprogramar todas igualmente para no quedar atascados
    for (const a of dueAlerts) {
      await rescheduleAfterSend(a.id, a.repeat_every_minutes, now);
    }
    return NextResponse.json({ ok: true, due: dueAlerts.length, targets, sent: 0, skipped: dueAlerts.length }, { headers: H });
  }

  let sent = 0, skipped = 0, failed = 0;

  for (const a of dueAlerts) {
    // 3) ¿Está en ventana AHORA?
    const { data: vis, error: errVis } = await supabase
      .from("announcements_visible_now")
      .select("id")
      .eq("id", a.id)
      .limit(1)
      .maybeSingle();

    if (errVis) {
      console.warn("[dispatch] visible_now error:", errVis);
    }

    if (!vis) {
      // No está en ventana ahora → reprogramar al próximo inicio de ventana
      const nextStart = await nextWindowStartUtc(a.id);
      await supabase
        .from("announcements")
        .update({ next_run_at: nextStart, last_sent_at: null })
        .eq("id", a.id);
      skipped++;
      continue;
    }

    // 4) Enviar a todas las suscripciones
    const payload = JSON.stringify({
      title: a.title,
      body: a.content,
      tag: `alert-${a.id}`,     // reemplazo (un solo “toast”)
      renotify: false,
      requireInteraction: true,
      data: { url: "https://TU-FRONT-END/?alert=" + a.id }
      // icon/badge opcionales aquí si quieres
    });

    for (const sub of subs!) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
          payload,
          { TTL: 900, urgency: "high" } // 15 min y prioridad alta
        );
        sent++;
      } catch (e: any) {
        failed++;
        const code = e?.statusCode;
        console.error("[dispatch] push fail", (sub.endpoint || "").slice(-24), code, e?.message);
        // Revocar inválidas
        if (code === 404 || code === 410) {
          await supabase
            .from("push_subscriptions")
            .update({ revoked_at: new Date().toISOString() })
            .eq("endpoint", sub.endpoint);
        }
      }
    }

    // 5) Marcar envío y reprogramar siguiente
    await rescheduleAfterSend(a.id, a.repeat_every_minutes, now);
  }

  return NextResponse.json(
    { ok: true, due: dueAlerts.length, targets, sent, skipped, failed },
    { headers: H }
  );
}

/** Reprograma next_run_at en función de repeat_every_minutes y la ventana. */
async function rescheduleAfterSend(id: number, repeatEvery: number | null, nowIso: string) {
  // 5.1 si no hay repetición → un solo envío
  if (repeatEvery == null) {
    await supabase
      .from("announcements")
      .update({ last_sent_at: nowIso, next_run_at: null })
      .eq("id", id);
    return;
  }

  // 5.2 candidato = ahora + repeatEvery
  const candidate = new Date(Date.parse(nowIso) + repeatEvery * 60_000).toISOString();

  // ¿candidate está dentro de la ventana?
  const { data: inWin, error: errWin } = await supabase.rpc("ann_is_in_window", { a_id: id, ts_in: candidate });
  if (errWin) {
    console.warn("[dispatch] ann_is_in_window error:", errWin);
  }

  if (inWin === true) {
    await supabase
      .from("announcements")
      .update({ last_sent_at: nowIso, next_run_at: candidate })
      .eq("id", id);
    return;
  }

  // 5.3 si queda fuera, buscar la próxima apertura de ventana
  const nextStart = await nextWindowStartUtc(id, candidate);
  await supabase
    .from("announcements")
    .update({ last_sent_at: nowIso, next_run_at: nextStart })
    .eq("id", id);
}

/** Llama a la función SQL que calcula el próximo inicio de ventana en UTC */
async function nextWindowStartUtc(id: number, fromIso?: string) {
  const { data, error } = await supabase.rpc("ann_next_window_start_utc", {
    a_id: id,
    from_ts: fromIso ?? new Date().toISOString()
  });
  if (error) {
    console.warn("[dispatch] ann_next_window_start_utc error:", error);
  }
  return data; // puede ser null si no hay más ventanas futuras
}

