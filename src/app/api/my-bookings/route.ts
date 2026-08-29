import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Public, but only returns rows matching the exact device_id the caller sends —
// a random UUID generated in the customer's own browser (see lib/deviceId.ts).
// Nobody else can guess it, so this is safe without a login step.
export async function GET(request: Request) {
  const deviceId = new URL(request.url).searchParams.get("device_id");
  if (!deviceId) {
    return NextResponse.json({ bookings: [] });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bookings")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: data });
}
