"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Booking, Worker } from "@/lib/types";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toCsv(bookings: Booking[], workerNameById: Map<string, string>) {
  const headers = [
    "id",
    "name",
    "phone",
    "car_number",
    "car_color",
    "parking_slot",
    "wash_type",
    "key_option",
    "key_status",
    "status",
    "location",
    "worker",
    "created_at",
  ];

  const rows = bookings.map((b) => [
    b.id,
    b.name,
    b.phone,
    b.car_number,
    b.car_color,
    b.parking_slot,
    b.wash_type,
    b.key_option,
    b.key_status,
    b.status,
    b.location,
    b.worker_id ? workerNameById.get(b.worker_id) ?? b.worker_id : "",
    b.created_at,
  ]);

  const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;

  return [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");
}

export default function DailyReport({ workers }: { workers: Worker[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setBookings(data as Booking[]);
        setLoading(false);
      });
  }, [supabase]);

  const workerNameById = useMemo(
    () => new Map(workers.map((w) => [w.id, w.name])),
    [workers]
  );

  const todaysBookings = useMemo(
    () => bookings.filter((b) => new Date(b.created_at) >= startOfToday()),
    [bookings]
  );

  const byStatus = useMemo(() => countBy(todaysBookings, (b) => b.status), [todaysBookings]);
  const byWashType = useMemo(() => countBy(todaysBookings, (b) => b.wash_type), [todaysBookings]);
  const byWorker = useMemo(
    () =>
      countBy(todaysBookings, (b) =>
        b.worker_id ? workerNameById.get(b.worker_id) ?? "Unknown" : "Unassigned"
      ),
    [todaysBookings, workerNameById]
  );

  function exportCsv() {
    const csv = toCsv(bookings, workerNameById);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quickwash-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="text-sm text-slate-500">Loading report...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{todaysBookings.length} bookings today</p>
        <button
          onClick={exportCsv}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Export CSV (all bookings)
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <ReportCard title="By Status" counts={byStatus} />
        <ReportCard title="By Wash Type" counts={byWashType} />
        <ReportCard title="By Staff" counts={byWorker} />
      </div>
    </div>
  );
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

function ReportCard({ title, counts }: { title: string; counts: Map<string, number> }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500 mb-2">{title}</p>
      {counts.size === 0 && <p className="text-sm text-slate-400">No data yet</p>}
      <div className="space-y-1">
        {Array.from(counts.entries()).map(([label, count]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-slate-700">{label}</span>
            <span className="font-medium text-slate-900">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
