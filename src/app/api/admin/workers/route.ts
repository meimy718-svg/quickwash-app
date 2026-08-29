import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaffManager } from "@/lib/supabase/requireAdmin";
import { phoneToSyntheticEmail } from "@/lib/phoneAuth";

export async function POST(request: Request) {
  const { error: authError } = await requireStaffManager();
  if (authError) return authError;

  const { name, phone, password } = await request.json();
  if (!name || !phone || !password) {
    return NextResponse.json(
      { error: "Name, phone and password are required" },
      { status: 400 }
    );
  }
  if (password.length < 4) {
    return NextResponse.json(
      { error: "Password must be at least 4 characters" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const syntheticEmail = phoneToSyntheticEmail(phone);

  const { data: authUser, error: createUserError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
  });

  if (createUserError || !authUser.user) {
    return NextResponse.json(
      {
        error:
          createUserError?.message ??
          "Could not create login — this phone number may already be registered",
      },
      { status: 400 }
    );
  }

  const { data: worker, error: workerError } = await admin
    .from("workers")
    .insert({ name, phone, available: true })
    .select()
    .single();

  if (workerError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: workerError.message }, { status: 400 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    email: syntheticEmail,
    phone,
    name,
    role: "worker",
    worker_id: worker.id,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    await admin.from("workers").delete().eq("id", worker.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ worker });
}
