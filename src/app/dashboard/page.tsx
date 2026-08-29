"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { playAlertSound } from "@/lib/playAlert";
import StaffHeader from "@/components/StaffHeader";
import StatusPill from "@/components/StatusPill";
import TeamManagement from "@/components/TeamManagement";
import type { Booking, BookingStatus, KeyStatus, Worker } from "@/lib/types";

type Filter = "all" | BookingStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const KEY_STATUS_FLOW: KeyStatus[] = ["awaiting", "collected", "returned"];
const KEY_STATUS_LABEL: Record<KeyStatus, string> = {
  none: "No key handover",
  awaiting: "Awaiting",
  collected: "Collected",
  returned: "Returned",
};

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"bookings" | "team">("bookings");

  const loadBookings = useCallback(async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setBookings(data as Booking[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadBookings();

    supabase
      .from("workers")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) setWorkers(data as Worker[]);
      });
  }, [loadBookings, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-bookings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          setBookings((prev) => [payload.new as Booking, ...prev]);
          playAlertSound();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings" },
        (payload) => {
          setBookings((prev) =>
            prev.map((b) => (b.id === payload.new.id ? (payload.new as Booking) : b))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function assignWorker(bookingId: string, workerId: string) {
    await supabase
      .from("bookings")
      .update({ worker_id: workerId || null })
      .eq("id", bookingId);
  }

  async function advanceKeyStatus(booking: Booking) {
    const idx = KEY_STATUS_FLOW.indexOf(booking.key_status as KeyStatus);
    const next = KEY_STATUS_FLOW[Math.min(idx + 1, KEY_STATUS_FLOW.length - 1)];
    await supabase.from("bookings").update({ key_status: next }).eq("id", booking.id);
  }

  const filtered = bookings.filter((b) => filter === "all" || b.status === filter);

  return (
    <div className="min-h-screen bg-slate-50">
      <StaffHeader title="Supervisor Dashboard" />

      <div className="px-4 py-4 max-w-3xl mx-auto space-y-4">
        <div className="flex gap-2">
          {(["bookings", "team"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-sm rounded-full px-4 py-1.5 border transition ${
                view === v
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-300 text-slate-600"
              }`}
            >
              {v === "bookings" ? "Bookings" : "Team"}
            </button>
          ))}
        </div>

        {view === "team" && <TeamManagement />}

        {view === "bookings" && (
          <>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-sm rounded-full px-3 py-1.5 border whitespace-nowrap transition ${
                filter === f.value
                  ? "bg-slate-900 text-white border-slate-900"
                  : "border-slate-300 text-slate-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-slate-500">Loading bookings...</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-slate-500">No bookings here yet.</p>
        )}

        <div className="space-y-3">
          {filtered.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    {booking.car_number}{" "}
                    <span className="font-normal text-slate-500">
                      ({booking.car_color})
                    </span>
                    {booking.key_option === "Hand key to worker" && (
                      <span className="ml-1" title="Key handed to worker">
                        🔑
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">
                    {booking.name} · {booking.phone}
                  </p>
                </div>
                <StatusPill status={booking.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                <p>Slot: {booking.parking_slot}</p>
                <p>Wash: {booking.wash_type}</p>
                <p>Location: {booking.location}</p>
                <p>OTP: {booking.otp}</p>
              </div>

              {booking.key_option === "Hand key to worker" && (
                <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-slate-600">
                    Key: {KEY_STATUS_LABEL[booking.key_status]}
                  </span>
                  {booking.key_status !== "returned" && (
                    <button
                      onClick={() => advanceKeyStatus(booking)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      Advance →
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-500 mb-1">Assign staff</label>
                <select
                  value={booking.worker_id ?? ""}
                  onChange={(e) => assignWorker(booking.id, e.target.value)}
                  className="input"
                >
                  <option value="">Unassigned</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id} disabled={!w.available}>
                      {w.name} {!w.available ? "(unavailable)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
