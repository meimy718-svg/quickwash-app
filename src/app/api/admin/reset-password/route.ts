import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaffManager, randomTempPassword } from "@/lib/supabase/requireAdmin";

// Phone-based Staff/Supervisor accounts have no real email, so the usual
// "forgot password" email flow can't reach them. This lets an Admin or
// Supervisor issue a fresh temporary password to hand over directly instead.
export async function POST(request: Request) {
  const { error: authError, role: requesterRole } = await requireStaffManager();
  if (authError) return authError;

  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Supervisors may reset Staff/Supervisor passwords, but not an Admin's.
  if (targetProfile.role === "admin" && requesterRole !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const tempPassword = randomTempPassword();
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password: tempPassword,
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ tempPassword });
}
