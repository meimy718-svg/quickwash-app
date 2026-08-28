import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function randomTempPassword() {
  return `Qw-${Math.random().toString(36).slice(2, 10)}!1`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { name, phone, email } = await request.json();
  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const tempPassword = randomTempPassword();

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Could not create login" },
      { status: 400 }
    );
  }

  const { data: worker, error: workerError } = await admin
    .from("workers")
    .insert({ name, phone: phone || null, email, available: true })
    .select()
    .single();

  if (workerError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: workerError.message }, { status: 400 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    email,
    role: "worker",
    worker_id: worker.id,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    await admin.from("workers").delete().eq("id", worker.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ worker, tempPassword });
}
