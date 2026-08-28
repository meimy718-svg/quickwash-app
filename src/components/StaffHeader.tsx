"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StaffHeader({ title }: { title: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-400 leading-none">QuickWash</p>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      </div>
      <button
        onClick={handleSignOut}
        className="text-sm text-slate-500 hover:text-slate-900 transition"
      >
        Sign out
      </button>
    </header>
  );
}
