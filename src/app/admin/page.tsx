"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import StaffHeader from "@/components/StaffHeader";
import DailyReport from "@/components/DailyReport";
import PrintableQrSign from "@/components/PrintableQrSign";
import TeamManagement from "@/components/TeamManagement";
import type { Location, Worker } from "@/lib/types";

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);

  const [locations, setLocations] = useState<Location[]>([]);
  const [locationName, setLocationName] = useState("");
  const [generatingQr, setGeneratingQr] = useState(false);
  const [printLocation, setPrintLocation] = useState<Location | null>(null);

  const [workers, setWorkers] = useState<Worker[]>([]);

  const loadLocations = useCallback(async () => {
    const { data } = await supabase
      .from("locations")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setLocations(data as Location[]);
  }, [supabase]);

  const loadWorkers = useCallback(async () => {
    const { data } = await supabase.from("workers").select("*").order("name");
    if (data) setWorkers(data as Worker[]);
  }, [supabase]);

  useEffect(() => {
    loadLocations();
    loadWorkers();
  }, [loadLocations, loadWorkers]);

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!locationName.trim()) return;
    setGeneratingQr(true);

    const bookingUrl = `${window.location.origin}/book?location=${encodeURIComponent(
      locationName.trim()
    )}`;
    const qrDataUrl = await QRCode.toDataURL(bookingUrl, { width: 320, margin: 1 });

    await supabase.from("locations").insert({
      name: locationName.trim(),
      qr_code_url: qrDataUrl,
    });

    setLocationName("");
    setGeneratingQr(false);
    loadLocations();
  }

  return (
    <>
      {printLocation && (
        <PrintableQrSign location={printLocation} onDone={() => setPrintLocation(null)} />
      )}
      <div className="min-h-screen bg-slate-50 print:hidden">
        <StaffHeader title="Admin Panel" />

        <div className="px-4 py-4 max-w-3xl mx-auto space-y-8">
          <section className="space-y-3">
            <h2 className="font-semibold text-slate-900">Locations &amp; QR Codes</h2>

            <form onSubmit={handleAddLocation} className="flex gap-2">
              <input
                placeholder="e.g. Level 2 - Gate A"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="input flex-1"
              />
              <button
                type="submit"
                disabled={generatingQr}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4"
              >
                {generatingQr ? "Generating..." : "Add Location"}
              </button>
            </form>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {locations.map((loc) => (
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
          </section>

          <TeamManagement />

          <section className="space-y-3">
            <h2 className="font-semibold text-slate-900">Daily Report</h2>
            <DailyReport workers={workers} />
          </section>
        </div>
      </div>
    </>
  );
}
