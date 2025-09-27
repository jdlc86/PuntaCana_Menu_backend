import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// cliente supabase con service role (importa URL y KEY de env vars)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // clave secreta service role
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { endpoint, keys, lang, tz, user_agent } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // UPSERT en tabla push_subscriptions
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        lang,
        tz,
        user_agent,
        revoked_at: null,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
}
