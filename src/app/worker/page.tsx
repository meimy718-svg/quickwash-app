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
  const [otpVerified, setOtpVerified] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

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

  async function verifyOtp(booking: Booking) {
    const entered = otpInputs[booking.id] ?? "";
    if (entered !== booking.otp) {
      setOtpErrors((prev) => ({ ...prev, [booking.id]: "Incorrect OTP" }));
      setOtpVerified((prev) => ({ ...prev, [booking.id]: false }));
      return;
    }

    setOtpErrors((prev) => ({ ...prev, [booking.id]: "" }));
    setOtpVerified((prev) => ({ ...prev, [booking.id]: true }));

    if (booking.key_option === "Hand key to worker") {
      await supabase
        .from("bookings")
        .update({ key_status: "collected" })
        .eq("id", booking.id);
      loadAssignedBookings();
    }
  }

  async function startJob(booking: Booking) {
    await supabase.from("bookings").update({ status: "in_progress" }).eq("id", booking.id);
    loadAssignedBookings();
  }

  async function uploadPhoto(booking: Booking, stage: "before" | "after", file: File) {
    setUploading((prev) => ({ ...prev, [`${booking.id}-${stage}`]: true }));

    const path = `${booking.id}/${stage}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("car-photos")
      .upload(path, file, { upsert: false });

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage.from("car-photos").getPublicUrl(path);
      const column = stage === "before" ? "photos_before" : "photos_after";
      const existing = booking[column] ?? [];

      await supabase
        .from("bookings")
        .update({ [column]: [...existing, publicUrlData.publicUrl] })
        .eq("id", booking.id);

      loadAssignedBookings();
    }

    setUploading((prev) => ({ ...prev, [`${booking.id}-${stage}`]: false }));
  }

  async function completeJob(booking: Booking) {
    await supabase.from("bookings").update({ status: "done" }).eq("id", booking.id);
    loadAssignedBookings();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <StaffHeader title="Staff View" />

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
                  OTP verification is optional — ask the customer for their 4-digit OTP to
                  confirm the handover, or just start the job.
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
                    onClick={() => verifyOtp(booking)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4"
                  >
                    Verify OTP
                  </button>
                </div>
                {otpErrors[booking.id] && (
                  <p className="text-xs text-red-600">{otpErrors[booking.id]}</p>
                )}
                {otpVerified[booking.id] && (
                  <p className="text-xs text-green-600">OTP verified ✓</p>
                )}

                <button
                  onClick={() => startJob(booking)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg py-2.5 transition"
                >
                  Start Job
                </button>
              </div>
            )}

            {booking.status === "in_progress" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <PhotoUploadButton
                    label="Before Photo (optional)"
                    count={booking.photos_before?.length ?? 0}
                    uploading={uploading[`${booking.id}-before`]}
                    onSelect={(file) => uploadPhoto(booking, "before", file)}
                  />
                  <PhotoUploadButton
                    label="After Photo (optional)"
                    count={booking.photos_after?.length ?? 0}
                    uploading={uploading[`${booking.id}-after`]}
                    onSelect={(file) => uploadPhoto(booking, "after", file)}
                  />
                </div>

                <button
                  onClick={() => completeJob(booking)}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg py-2.5 transition"
                >
                  Complete Job
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotoUploadButton({
  label,
  count,
  uploading,
  onSelect,
}: {
  label: string;
  count: number;
  uploading?: boolean;
  onSelect: (file: File) => void;
}) {
  return (
    <label className="flex flex-col items-center justify-center gap-1 border border-dashed border-slate-300 rounded-lg py-3 text-xs text-slate-500 cursor-pointer hover:border-blue-400">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = "";
        }}
      />
      <span>{uploading ? "Uploading..." : label}</span>
      {count > 0 && <span className="text-green-600 font-medium">{count} uploaded ✓</span>}
    </label>
  );
}
