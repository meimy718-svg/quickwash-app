"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateDeviceId } from "@/lib/deviceId";
import StatusPill from "@/components/StatusPill";
import type { Booking, KeyOption, WashType } from "@/lib/types";

const WASH_TYPES: WashType[] = ["Basic", "Premium", "Full Detail"];
const KEY_OPTIONS: KeyOption[] = [
  "Hand key to worker",
  "Drive myself",
  "Drop at info desk",
];
const KEY_OPTION_LABELS: Record<KeyOption, string> = {
  "Hand key to worker": "Collect it from me",
  "Drive myself": "Drive myself",
  "Drop at info desk": "Specify",
};

interface BookingResult {
  id: string;
  otp: string;
  name: string;
  car_number: string;
  wash_type: string;
  location: string;
}

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function uniqueCars(bookings: Booking[]) {
  const seen = new Map<string, Booking>();
  for (const b of bookings) {
    if (!seen.has(b.car_number)) seen.set(b.car_number, b);
  }
  return Array.from(seen.values());
}

function BookingForm() {
  const searchParams = useSearchParams();
  const location = searchParams.get("location") ?? "Main Entrance";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [carColor, setCarColor] = useState("");
  const [parkingSlot, setParkingSlot] = useState("");
  const [washType, setWashType] = useState<WashType>("Basic");
  const [keyOption, setKeyOption] = useState<KeyOption>("Drive myself");
  const [keyHandoverNote, setKeyHandoverNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

  const [history, setHistory] = useState<Booking[]>([]);
  const [deviceId, setDeviceId] = useState("");

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    if (!id) return;
    fetch(`/api/my-bookings?device_id=${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((json) => setHistory(json.bookings ?? []))
      .catch(() => {});
  }, []);

  function bookAgain(car: Booking) {
    setName(car.name);
    setPhone(car.phone);
    setCarNumber(car.car_number);
    setCarColor(car.car_color);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const id = crypto.randomUUID();
    const otp = generateOtp();

    const { error: insertError } = await supabase.from("bookings").insert({
      id,
      name,
      phone,
      car_number: carNumber,
      car_color: carColor,
      parking_slot: parkingSlot,
      wash_type: washType,
      key_option: keyOption,
      key_status: keyOption === "Hand key to worker" ? "awaiting" : "none",
      key_handover_note:
        keyOption === "Drop at info desk" ? keyHandoverNote || null : null,
      status: "pending",
      location,
      otp,
      device_id: deviceId || null,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setResult({
      id,
      otp,
      name,
      car_number: carNumber,
      wash_type: washType,
      location,
    });
  }

  if (result) {
    const statusUrl = `${window.location.origin}/status/${result.id}`;
    const summary = `4OR CarSpa Booking Confirmed!\nName: ${result.name}\nCar: ${result.car_number}\nWash: ${result.wash_type}\nLocation: ${result.location}\nBooking ID: ${result.id}\nOTP: ${result.otp}\n\nShow this OTP to the 4OR CarSpa team when handing over your key.\n\nCheck your status anytime: ${statusUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(summary)}`;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto text-2xl">
            ✓
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Booking Confirmed</h1>
            <p className="text-sm text-slate-500">We&apos;ll see you at {result.location}</p>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Booking ID</span>
              <span className="font-mono text-slate-900">{result.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Your OTP</span>
              <span className="text-2xl font-bold tracking-widest text-blue-600">
                {result.otp}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Keep this OTP handy — you&apos;ll need it when handing over your key.
          </p>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg py-2.5 text-sm transition"
          >
            Share via WhatsApp
          </a>

          <a
            href={`/status/${result.id}`}
            className="block w-full border border-slate-300 text-slate-700 font-medium rounded-lg py-2.5 text-sm transition hover:bg-slate-50"
          >
            View status page
          </a>

          <button
            onClick={() => {
              setResult(null);
              setParkingSlot("");
              setWashType("Basic");
              setKeyOption("Drive myself");
              setKeyHandoverNote("");
            }}
            className="w-full text-slate-500 text-sm underline"
          >
            Book another car
          </button>
        </div>
      </div>
    );
  }

  const cars = uniqueCars(history);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm mx-auto space-y-4">
        {cars.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">Book again</p>
            <div className="flex flex-wrap gap-2">
              {cars.map((car) => (
                <button
                  key={car.car_number}
                  type="button"
                  onClick={() => bookAgain(car)}
                  className="text-sm text-slate-700 rounded-full border border-slate-300 px-3 py-1.5 hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  {car.car_number} ({car.car_color})
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
        >
          <div>
            <h1 className="text-xl font-semibold text-slate-900">4OR CarSpa</h1>
            <p className="text-sm text-slate-500 mt-1">Booking for {location}</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Field label="Name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Phone">
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Car Number">
              <input
                required
                value={carNumber}
                onChange={(e) => setCarNumber(e.target.value.toUpperCase())}
                className="input"
              />
            </Field>
            <Field label="Car Color">
              <input
                required
                value={carColor}
                onChange={(e) => setCarColor(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <Field label="Parking Slot">
            <input
              required
              value={parkingSlot}
              onChange={(e) => setParkingSlot(e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Wash Type">
            <div className="grid grid-cols-3 gap-2">
              {WASH_TYPES.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setWashType(type)}
                  className={`text-sm rounded-lg border px-2 py-2 transition ${
                    washType === type
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-slate-300 text-slate-700"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Key Handover Option">
            <div className="space-y-2">
              {KEY_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                    keyOption === option
                      ? "border-blue-600 bg-blue-50 text-slate-900 font-medium"
                      : "border-slate-300 text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="keyOption"
                    checked={keyOption === option}
                    onChange={() => setKeyOption(option)}
                  />
                  {KEY_OPTION_LABELS[option]}
                </label>
              ))}
            </div>

            {keyOption === "Drop at info desk" && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  How will you hand over your key? (optional)
                </label>
                <input
                  value={keyHandoverNote}
                  onChange={(e) => setKeyHandoverNote(e.target.value)}
                  placeholder="e.g. Leaving it with the security guard at Gate 2"
                  className="input"
                />
              </div>
            )}
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm transition"
          >
            {submitting ? "Booking..." : "Confirm Booking"}
          </button>
        </form>

        {history.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">Your recent bookings</p>
            <div className="space-y-2">
              {history.slice(0, 5).map((b) => (
                <a
                  key={b.id}
                  href={`/status/${b.id}`}
                  className="flex items-center justify-between text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                >
                  <span className="text-slate-700">
                    {b.car_number} · {b.wash_type}
                  </span>
                  <StatusPill status={b.status} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={null}>
      <BookingForm />
    </Suspense>
  );
}
