export const runtime = "nodejs";
const REPEAT_MINUTES = 10; // tiempo minimo entre notificaciones 10 min// este #siempre tiene ques er mayor que e intervalo del cron definido en la razo del proyecto. Ademas esta programado de 8-11 hora de Espama
const CREATE_NEW_TOAST_EACH_BUCKET = false; // false => reemplaza la notificación (un solo toast)

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// ---- Web Push (requiere Node.js runtime)
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// bucket UTC redondeado hacia abajo al múltiplo de REPEAT_MINUTES (formato compacto)
function currentBucketIsoUtc(stepMinutes = REPEAT_MINUTES, baseDate = new Date()) {
  const d = new Date(baseDate);
  const m = d.getUTCMinutes();
  const floored = Math.floor(m / stepMinutes) * stepMinutes;
  d.setUTCMinutes(floored, 0, 0);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const HH = String(d.getUTCHours()).padStart(2, "0");
  const MM = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${HH}${MM}Z`;
}

export async function GET(req: Request) {
  // Autorizar cron: vale header o query (?secret=...)
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("secret");
  const fromHeader = req.headers.get("authorization");
  const okHeader = fromHeader === `Bearer ${process.env.CRON_SECRET}`;
  const okQuery = !!fromQuery && fromQuery === process.env.CRON_SECRET;
  if (!okHeader && !okQuery) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const noStoreHeaders = { "Cache-Control": "no-store" as const };

  // 1) Leer alertas visibles ahora (type='alert')
  const { data: alerts, error: errAlerts } = await supabase
    .from("announcements_visible_now")
    .select("*")
    .eq("type", "alert");

  if (errAlerts) {
    console.error("[dispatch] DB alerts error:", errAlerts);
    return NextResponse.json({ error: "db_error_alerts" }, { status: 500, headers: noStoreHeaders });
  }
  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ ok: true, alerts: 0, targets: 0, sent: 0, skipped: 0, failed: 0 }, { headers: noStoreHeaders });
  }

  // 2) Suscripciones activas
  const { data: subs, error: errSubs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .is("revoked_at", null);

  if (errSubs) {
    console.error("[dispatch] DB subs error:", errSubs);
    return NextResponse.json({ error: "db_error_subs" }, { status: 500, headers: noStoreHeaders });
  }

  const targets = subs?.length ?? 0;
  if (targets === 0) {
    return NextResponse.json({ ok: true, alerts: alerts.length, targets, sent: 0, skipped: 0, failed: 0 }, { headers: noStoreHeaders });
  }

  const bucket = currentBucketIsoUtc(REPEAT_MINUTES); // mismo para todo el run
  let sent = 0, skipped = 0, failed = 0;

  for (const alert of alerts) {
    const updatedIso = new Date(alert.updated_at).toISOString();

    // Si quieres que se vea una nueva notificación en cada bucket => tag único por bucket.
    // Si prefieres que "reemplace" la anterior => tag fijo por alerta.
    const tag = CREATE_NEW_TOAST_EACH_BUCKET ? `alert-${alert.id}-${bucket}` : `alert-${alert.id}`;

    const payload = JSON.stringify({
      title: alert.title,
      body: alert.content,
      tag,
      data: { url: "https://TU-FRONT-END/?alert=" + alert.id },
      requireInteraction: true,
    });

    for (const sub of subs!) {
      // 3) Dedupe por bucket: una vez por suscripción y por (alert, updated_at, bucket)
      const dedupeKey = `alert:${alert.id}:${updatedIso}:${bucket}`;

      // Intentar registrar "pending". Si viola UNIQUE → ya se envió en este bucket ⇒ skip.
      const { error: logErr } = await supabase
        .from("push_send_log")
        .insert({
          subscription_endpoint: sub.endpoint,
          dedupe_key: dedupeKey,
          alert_id: alert.id,
          status: "pending",
        });

      // Unique violation en Postgres = código '23505'
      if (logErr) {
        if ((logErr as any).code === "23505" || String(logErr.message || "").toLowerCase().includes("duplicate")) {
          skipped++;
          continue;
        } else {
          console.warn("[dispatch] push_send_log insert error:", (logErr as any).code || logErr);
        }
      }

      try {
        // TTL/urgency: mejora entrega cuando el navegador está en background/cerrado
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
          payload,
          { TTL: 900, urgency: "high" } // 15 min, prioritaria
        );
        sent++;

        // marcar 'sent'
        await supabase
          .from("push_send_log")
          .update({ status: "sent" })
          .eq("subscription_endpoint", sub.endpoint)
          .eq("dedupe_key", dedupeKey);
      } catch (e: any) {
        failed++;
        const code = e?.statusCode;

        console.error("[dispatch] Push failed", (sub.endpoint || "").slice(-24), code, e?.message);

        // Revocar endpoints inválidos
        if (code === 404 || code === 410) {
          await supabase
            .from("push_subscriptions")
            .update({ revoked_at: new Date().toISOString() })
            .eq("endpoint", sub.endpoint);
        }

        // marcar 'failed'
        await supabase
          .from("push_send_log")
          .update({ status: "failed", error_code: String(code || e?.message || "err") })
          .eq("subscription_endpoint", sub.endpoint)
          .eq("dedupe_key", dedupeKey);
      }
    }
  }

  return NextResponse.json(
    { ok: true, alerts: alerts.length, targets, sent, skipped, failed, bucket, repeat_minutes: REPEAT_MINUTES },
    { headers: noStoreHeaders }
  );
}



