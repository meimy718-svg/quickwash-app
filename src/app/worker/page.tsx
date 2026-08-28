"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import StaffHeader from "@/components/StaffHeader";
import StatusPill from "@/components/StatusPill";
import type { Booking } from "@/lib/types";

export default function WorkerPage() {
  const supabase = useMemo(() => createClient(), []);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [otpErrors, setOtpErrors] = useState<Record<string, string>>({});

  const loadAssignedBookings = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("worker_id")
      .eq("id", user.id)
      .single();

    if (!profile?.worker_id) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("worker_id", profile.worker_id)
      .neq("status", "done")
      .order("created_at", { ascending: true });

    if (data) setBookings(data as Booking[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadAssignedBookings();
  }, [loadAssignedBookings]);

  useEffect(() => {
    const channel = supabase
      .channel("worker-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadAssignedBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadAssignedBookings]);

  async function verifyAndStart(booking: Booking) {
    const entered = otpInputs[booking.id] ?? "";
    if (entered !== booking.otp) {
      setOtpErrors((prev) => ({ ...prev, [booking.id]: "Incorrect OTP" }));
      return;
    }

    setOtpErrors((prev) => ({ ...prev, [booking.id]: "" }));

    await supabase
      .from("bookings")
      .update({
        status: "in_progress",
        key_status: booking.key_option === "Hand key to worker" ? "collected" : booking.key_status,
      })
      .eq("id", booking.id);

    loadAssignedBookings();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <StaffHeader title="Worker View" />

      <div className="px-4 py-4 max-w-md mx-auto space-y-3">
        {loading && <p className="text-sm text-slate-500">Loading your jobs...</p>}
        {!loading && bookings.length === 0 && (
          <p className="text-sm text-slate-500">No jobs assigned to you right now.</p>
        )}

        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  {booking.car_number}{" "}
                  <span className="font-normal text-slate-500">({booking.car_color})</span>
                </p>
                <p className="text-sm text-slate-500">Slot {booking.parking_slot} · {booking.wash_type}</p>
              </div>
              <StatusPill status={booking.status} />
            </div>

            {booking.status === "pending" && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  Ask the customer for their 4-digit OTP to confirm the handover and start
                  the job.
                </p>
                <div className="flex gap-2">
                  <input
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="OTP"
                    value={otpInputs[booking.id] ?? ""}
                    onChange={(e) =>
                      setOtpInputs((prev) => ({ ...prev, [booking.id]: e.target.value }))
                    }
                    className="input flex-1 text-center tracking-widest"
                  />
                  <button
                    onClick={() => verifyAndStart(booking)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4"
                  >
                    Start Job
                  </button>
                </div>
                {otpErrors[booking.id] && (
                  <p className="text-xs text-red-600">{otpErrors[booking.id]}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
