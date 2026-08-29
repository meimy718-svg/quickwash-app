"use client";

import { useEffect } from "react";
import type { Location } from "@/lib/types";

export default function PrintableQrSign({
  location,
  onDone,
}: {
  location: Location;
  onDone: () => void;
}) {
  useEffect(() => {
    const handleAfterPrint = () => onDone();
    window.addEventListener("afterprint", handleAfterPrint);
    window.print();
    return () => window.removeEventListener("afterprint", handleAfterPrint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.id]);

  return (
    <div className="hidden print:flex print:flex-col print:items-center print:justify-center print:min-h-screen p-12 text-center">
      <p className="text-sm tracking-widest text-slate-500 uppercase mb-1">QuickWash</p>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">{location.name}</h1>

      {location.qr_code_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={location.qr_code_url}
          alt={`QR code for ${location.name}`}
          className="w-72 h-72 mx-auto mb-8"
        />
      )}

      <p className="text-lg font-semibold text-slate-900 mb-4">
        Scan to book your car wash
      </p>

      <ol className="text-left max-w-md mx-auto space-y-2 text-base text-slate-800 list-decimal list-inside">
        <li>Scan this QR code with your phone&apos;s camera</li>
        <li>
          Enter your name, phone number, car number, car color, and parking slot
        </li>
        <li>Choose your wash type: Basic, Premium, or Full Detail</li>
        <li>
          Choose how to leave your key: hand it to our team, keep it and drive in
          yourself, or drop it at the info desk
        </li>
        <li>You&apos;ll get a Booking ID and a 4-digit OTP — keep it safe</li>
        <li>
          Show your OTP to our team when handing over your key, and again when
          picking up your car
        </li>
      </ol>

      <p className="text-sm text-slate-400 mt-10">
        Questions? Ask any QuickWash team member on-site.
      </p>
    </div>
  );
}
