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
    "mall",
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
    b.mall ?? "",
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
  const [locationFilter, setLocationFilter] = useState<string>("all");

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

  const mallOptions = useMemo(
    () =>
      Array.from(new Set(bookings.map((b) => b.mall).filter((m): m is string => Boolean(m)))).sort(),
    [bookings]
  );

  const todaysFiltered = useMemo(
    () =>
      locationFilter === "all"
        ? todaysBookings
        : todaysBookings.filter((b) => b.mall === locationFilter),
    [todaysBookings, locationFilter]
  );

  const byMall = useMemo(
    () => countBy(todaysBookings, (b) => b.mall ?? "Unassigned"),
    [todaysBookings]
  );
  const byStatus = useMemo(() => countBy(todaysFiltered, (b) => b.status), [todaysFiltered]);
  const byWashType = useMemo(
    () => countBy(todaysFiltered, (b) => b.wash_type),
    [todaysFiltered]
  );
  const byWorker = useMemo(
    () =>
      countBy(todaysFiltered, (b) =>
        b.worker_id ? workerNameById.get(b.worker_id) ?? "Unknown" : "Unassigned"
      ),
    [todaysFiltered, workerNameById]
  );

  function exportCsv() {
    const rows =
      locationFilter === "all"
        ? bookings
        : bookings.filter((b) => b.mall === locationFilter);
    const csv = toCsv(rows, workerNameById);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `4or-carspa-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="text-sm text-slate-500">Loading report...</p>;

  return (
    <div className="space-y-4">
      {mallOptions.length > 1 && (
        <div>
          <label className="block text-xs text-slate-500 mb-1">Mall</label>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="input"
          >
            <option value="all">All malls</option>
            {mallOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{todaysFiltered.length} bookings today</p>
        <button
          onClick={exportCsv}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Export CSV ({locationFilter === "all" ? "all malls" : locationFilter})
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {mallOptions.length > 1 && <ReportCard title="By Mall" counts={byMall} />}
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
