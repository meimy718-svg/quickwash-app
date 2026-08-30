import StaffHeader from "@/components/StaffHeader";
import TabNav from "@/components/TabNav";

const TABS = [
  { href: "/dashboard", label: "Bookings" },
  { href: "/dashboard/team", label: "Team" },
  { href: "/dashboard/services", label: "Services" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <StaffHeader title="Supervisor Dashboard" />
      <TabNav tabs={TABS} />
      <div className="px-4 py-4 max-w-5xl mx-auto">{children}</div>
    </div>
  );
}
