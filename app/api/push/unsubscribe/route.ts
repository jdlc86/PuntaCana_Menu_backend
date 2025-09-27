import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "missing_endpoint" }, { status: 400 });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("endpoint", endpoint);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
}
