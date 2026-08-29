"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

const NAV_BY_ROLE: Record<UserRole, { href: string; label: string }[]> = {
  admin: [
    { href: "/admin", label: "Admin" },
    { href: "/dashboard", label: "Dashboard" },
  ],
  operator: [{ href: "/dashboard", label: "Dashboard" }],
  worker: [{ href: "/worker", label: "Staff" }],
};

export default function StaffHeader({ title }: { title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setRole(data.role as UserRole);
        });
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navLinks = role ? NAV_BY_ROLE[role] : [];

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-xs text-slate-400 leading-none">QuickWash</p>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        </div>
        {navLinks.length > 1 && (
          <nav className="flex gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm rounded-full px-3 py-1 transition ${
                  pathname === link.href
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
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
