import StaffHeader from "@/components/StaffHeader";
import TabNav from "@/components/TabNav";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/malls", label: "Malls & Locations" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/team", label: "Team" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 print:hidden">
      <StaffHeader title="Admin Panel" />
      <TabNav tabs={TABS} />
      <div className="px-4 py-4 max-w-5xl mx-auto">{children}</div>
    </div>
  );
}

