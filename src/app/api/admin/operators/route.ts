import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaffManager, randomTempPassword } from "@/lib/supabase/requireAdmin";
import { phoneToSyntheticEmail } from "@/lib/phoneAuth";

export async function POST(request: Request) {
  const { error: authError } = await requireStaffManager();
  if (authError) return authError;

  const { name, phone } = await request.json();
  if (!name || !phone) {
    return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const tempPassword = randomTempPassword();
  const syntheticEmail = phoneToSyntheticEmail(phone);

  const { data: authUser, error: createUserError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: tempPassword,
    email_confirm: true,
  });

  if (createUserError || !authUser.user) {
    return NextResponse.json(
      { error: createUserError?.message ?? "Could not create login — this phone number may already be registered" },
      { status: 400 }
    );
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    email: syntheticEmail,
    phone,
    name,
    role: "operator",
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ name, phone, tempPassword });
}
