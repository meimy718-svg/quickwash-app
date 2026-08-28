"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { KeyOption, WashType } from "@/lib/types";

const WASH_TYPES: WashType[] = ["Basic", "Premium", "Full Detail"];
const KEY_OPTIONS: KeyOption[] = [
  "Hand key to worker",
  "Drive myself",
  "Drop at info desk",
];

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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

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
      status: "pending",
      location,
      otp,
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
    const summary = `QuickWash Booking Confirmed!\nName: ${result.name}\nCar: ${result.car_number}\nWash: ${result.wash_type}\nLocation: ${result.location}\nBooking ID: ${result.id}\nOTP: ${result.otp}\n\nShow this OTP to the QuickWash team when handing over your key.`;
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

          <button
            onClick={() => {
              setResult(null);
              setName("");
              setPhone("");
              setCarNumber("");
              setCarColor("");
              setParkingSlot("");
              setWashType("Basic");
              setKeyOption("Drive myself");
            }}
            className="w-full text-slate-500 text-sm underline"
          >
            Book another car
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">QuickWash</h1>
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

        <Field label="Key Option">
          <div className="space-y-2">
            {KEY_OPTIONS.map((option) => (
              <label
                key={option}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                  keyOption === option
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="keyOption"
                  checked={keyOption === option}
                  onChange={() => setKeyOption(option)}
                />
                {option}
              </label>
            ))}
          </div>
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm transition"
        >
          {submitting ? "Booking..." : "Confirm Booking"}
        </button>
      </form>
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
