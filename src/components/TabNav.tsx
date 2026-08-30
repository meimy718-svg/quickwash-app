"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TabNav({
  tabs,
}: {
  tabs: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 bg-white">
      <nav className="flex gap-6 px-4 max-w-5xl mx-auto overflow-x-auto">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap text-sm py-3 border-b-2 transition ${
                active
                  ? "border-blue-600 text-blue-600 font-medium"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
