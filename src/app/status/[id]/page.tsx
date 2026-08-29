import { createAdminClient } from "@/lib/supabase/admin";
import StatusPill from "@/components/StatusPill";
import type { Booking } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const KEY_STATUS_LABEL: Record<string, string> = {
  none: "No key handover",
  awaiting: "Awaiting handover",
  collected: "Collected by our team",
  returned: "Returned to you",
};

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single<Booking>();

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center space-y-3">
          <h1 className="text-lg font-semibold text-slate-900">Booking not found</h1>
          <p className="text-sm text-slate-500">
            This link may be incorrect, or the booking no longer exists.
          </p>
          <a
            href="/book"
            className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2 text-sm transition"
          >
            Book a wash
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400">4OR CarSpa</p>
            <h1 className="text-lg font-semibold text-slate-900">
              {booking.car_number} ({booking.car_color})
            </h1>
          </div>
          <StatusPill status={booking.status} />
        </div>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Location</span>
            <span className="text-slate-900">{booking.location}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Wash type</span>
            <span className="text-slate-900">{booking.wash_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Parking slot</span>
            <span className="text-slate-900">{booking.parking_slot}</span>
          </div>
          {booking.key_option === "Hand key to worker" && (
            <div className="flex justify-between">
              <span className="text-slate-500">Key status</span>
              <span className="text-slate-900">
                {KEY_STATUS_LABEL[booking.key_status] ?? booking.key_status}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="text-sm text-slate-600">Your OTP</span>
          <span className="text-2xl font-bold tracking-widest text-blue-600">
            {booking.otp}
          </span>
        </div>

        <a href="/book" className="block text-center text-sm text-slate-500 underline">
          Book another car
        </a>
      </div>
    </div>
  );
}
