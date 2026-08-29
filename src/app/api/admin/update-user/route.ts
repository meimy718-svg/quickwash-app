import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaffManager } from "@/lib/supabase/requireAdmin";
import { phoneToSyntheticEmail } from "@/lib/phoneAuth";

export async function POST(request: Request) {
  const {
    error: authError,
    role: requesterRole,
    location: requesterLocation,
  } = await requireStaffManager();
  if (authError) return authError;

  const { userId, name, phone, password, location } = await request.json();
  if (!userId || !name || !phone) {
    return NextResponse.json(
      { error: "userId, name and phone are required" },
      { status: 400 }
    );
  }
  if (password && password.length < 4) {
    return NextResponse.json(
      { error: "Password must be at least 4 characters" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("role, worker_id")
    .eq("id", userId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Supervisors may edit Staff/Supervisor accounts, but not an Admin's.
  if (targetProfile.role === "admin" && requesterRole !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // This route uses the service-role client, which bypasses the mall-scoped
  // RLS a Supervisor is normally limited by — so enforce the same boundary
  // here explicitly: a Supervisor can only edit Staff at their own mall.
  if (targetProfile.role === "worker" && requesterRole === "operator") {
    const { data: targetWorker } = await admin
      .from("workers")
      .select("location")
      .eq("id", targetProfile.worker_id)
      .single();

    if (!targetWorker || targetWorker.location !== requesterLocation) {
      return NextResponse.json(
        { error: "You can only edit staff at your own mall" },
        { status: 403 }
      );
    }
  }

  const syntheticEmail = phoneToSyntheticEmail(phone);

  const { error: updateAuthError } = await admin.auth.admin.updateUserById(userId, {
    email: syntheticEmail,
    ...(password ? { password } : {}),
  });

  if (updateAuthError) {
    return NextResponse.json({ error: updateAuthError.message }, { status: 400 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      name,
      phone,
      email: syntheticEmail,
      ...(targetProfile.role === "operator" && location ? { location } : {}),
    })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  if (targetProfile.role === "worker" && targetProfile.worker_id) {
    // Only an Admin may reassign which mall a Staff member belongs to —
    // a Supervisor's own mall-scoped RLS wouldn't stop this route (it uses
    // the service-role client), so the restriction is enforced here instead.
    const { error: workerError } = await admin
      .from("workers")
      .update({
        name,
        phone,
        ...(requesterRole === "admin" && location ? { location } : {}),
      })
      .eq("id", targetProfile.worker_id);

    if (workerError) {
      return NextResponse.json({ error: workerError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
