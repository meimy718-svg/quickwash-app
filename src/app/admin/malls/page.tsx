"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import PrintableQrSign from "@/components/PrintableQrSign";
import MallsManagement from "@/components/MallsManagement";
import type { Location, Mall } from "@/lib/types";

export default function AdminMallsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [locations, setLocations] = useState<Location[]>([]);
  const [locationName, setLocationName] = useState("");
  const [locationMall, setLocationMall] = useState("");
  const [generatingQr, setGeneratingQr] = useState(false);
  const [printLocation, setPrintLocation] = useState<Location | null>(null);
  const [malls, setMalls] = useState<Mall[]>([]);

  const loadLocations = useCallback(async () => {
    const { data } = await supabase
      .from("locations")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setLocations(data as Location[]);
  }, [supabase]);

  const loadMalls = useCallback(async () => {
    const { data } = await supabase.from("malls").select("*").order("name");
    if (data) setMalls(data as Mall[]);
  }, [supabase]);

  useEffect(() => {
    loadLocations();
    loadMalls();
  }, [loadLocations, loadMalls]);

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!locationName.trim() || !locationMall) return;
    setGeneratingQr(true);

    const bookingUrl = `${window.location.origin}/book?location=${encodeURIComponent(
      locationName.trim()
    )}`;
    const qrDataUrl = await QRCode.toDataURL(bookingUrl, { width: 320, margin: 1 });

    await supabase.from("locations").insert({
      name: locationName.trim(),
      qr_code_url: qrDataUrl,
      mall: locationMall,
    });

    setLocationName("");
    setGeneratingQr(false);
    loadLocations();
  }

  const mallNames = malls.map((m) => m.name);
  const locationsByMall = new Map<string, Location[]>();
  for (const loc of locations) {
    const key = loc.mall ?? "Unassigned";
    locationsByMall.set(key, [...(locationsByMall.get(key) ?? []), loc]);
  }

  return (
    <div className="space-y-8">
      {printLocation && (
        <PrintableQrSign location={printLocation} onDone={() => setPrintLocation(null)} />
      )}

      <MallsManagement onChanged={loadMalls} />

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Locations &amp; QR Codes</h2>

        <form onSubmit={handleAddLocation} className="flex flex-col sm:flex-row gap-2">
          <input
            placeholder="e.g. Level 2 - Gate A"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="input flex-1"
          />
          <select
            required
            value={locationMall}
            onChange={(e) => setLocationMall(e.target.value)}
            className="input sm:w-48"
          >
            <option value="" disabled>
              Select mall
            </option>
            {mallNames.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={generatingQr || mallNames.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4"
          >
            {generatingQr ? "Generating..." : "Add Location"}
          </button>
        </form>
        {mallNames.length === 0 && (
          <p className="text-xs text-slate-400">Add a mall above first.</p>
        )}

        {Array.from(locationsByMall.entries()).map(([mallName, locs]) => (
          <div key={mallName} className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {mallName}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {locs.map((loc) => (
                <div
                  key={loc.id}
                  className="bg-white rounded-xl border border-slate-200 p-3 text-center space-y-2"
                >
                  {loc.qr_code_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={loc.qr_code_url}
                      alt={`QR code for ${loc.name}`}
                      className="w-full rounded-lg"
                    />
                  )}
                  <p className="text-sm font-medium text-slate-700">{loc.name}</p>
                  <button
                    onClick={() => setPrintLocation(loc)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    Print sign
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
