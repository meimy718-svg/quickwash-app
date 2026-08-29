import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

async function requireRole(allowedRoles: UserRole[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
      role: null,
      userId: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !allowedRoles.includes(profile.role as UserRole)) {
    return {
      error: NextResponse.json({ error: "Access denied" }, { status: 403 }),
      role: null,
      userId: null,
    };
  }

  return { error: null, role: profile.role as UserRole, userId: user.id };
}

// Admin-only actions (locations, and anything only the owner should do).
export async function requireAdmin() {
  return requireRole(["admin"]);
}

// Admin or Supervisor — both can manage Staff and Supervisor accounts.
export async function requireStaffManager() {
  return requireRole(["admin", "operator"]);
}

export function randomTempPassword() {
  return `Qw-${Math.random().toString(36).slice(2, 10)}!1`;
}
