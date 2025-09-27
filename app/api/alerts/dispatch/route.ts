export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Configurar Web Push
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
  // Autorizar cron
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Leer alertas activas
  const { data: alerts, error: errAlerts } = await supabase
    .from("announcements_visible_now")
    .select("*")
    .eq("type", "alert");

  if (errAlerts) {
    console.error(errAlerts);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ ok: true, alerts: 0, sent: 0 });
  }

  // Suscripciones activas
  const { data: subs, error: errSubs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .is("revoked_at", null);

  if (errSubs) {
    console.error(errSubs);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  let sent = 0;
  for (const alert of alerts) {
    const payload = JSON.stringify({
      title: alert.title,
      body: alert.content,
      tag: `alert-${alert.id}`,
      data: { url: "https://TU-FRONT-END/?alert=" + alert.id }
    });

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { auth: sub.auth, p256dh: sub.p256dh },
          },
          payload
        );
        sent++;
      } catch (e: any) {
        // Si es 410/404 → revocar suscripción
        if (e.statusCode === 410 || e.statusCode === 404) {
          await supabase
            .from("push_subscriptions")
            .update({ revoked_at: new Date().toISOString() })
            .eq("endpoint", sub.endpoint);
        }
        console.error("Push failed:", e.statusCode);
      }
    }
  }

  return NextResponse.json({ ok: true, alerts: alerts.length, sent });
}

