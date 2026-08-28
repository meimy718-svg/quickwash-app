import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exchanges a Supabase auth code (email confirmation, password recovery, etc.)
// for a session, then redirects on. Required because the browser/server clients
// use the PKCE flow, which needs this server-side exchange rather than relying
// on implicit URL-hash token detection.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
