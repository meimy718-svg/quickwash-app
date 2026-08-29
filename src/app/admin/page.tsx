"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import StaffHeader from "@/components/StaffHeader";
import DailyReport from "@/components/DailyReport";
import PrintableQrSign from "@/components/PrintableQrSign";
import type { Location, Profile, Worker } from "@/lib/types";

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);

  const [locations, setLocations] = useState<Location[]>([]);
  const [locationName, setLocationName] = useState("");
  const [generatingQr, setGeneratingQr] = useState(false);
  const [printLocation, setPrintLocation] = useState<Location | null>(null);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerForm, setWorkerForm] = useState({ name: "", phone: "", email: "" });
  const [workerSubmitting, setWorkerSubmitting] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [lastCreatedPassword, setLastCreatedPassword] = useState<string | null>(null);

  const [operators, setOperators] = useState<Profile[]>([]);
  const [operatorEmail, setOperatorEmail] = useState("");
  const [operatorSubmitting, setOperatorSubmitting] = useState(false);
  const [operatorError, setOperatorError] = useState<string | null>(null);
  const [lastCreatedOperatorPassword, setLastCreatedOperatorPassword] = useState<
    string | null
  >(null);

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

  const loadOperators = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "operator")
      .order("created_at", { ascending: false });
    if (data) setOperators(data as Profile[]);
  }, [supabase]);

  useEffect(() => {
    loadLocations();
    loadWorkers();
    loadOperators();
  }, [loadLocations, loadWorkers, loadOperators]);

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

  async function handleAddWorker(e: React.FormEvent) {
    e.preventDefault();
    setWorkerSubmitting(true);
    setWorkerError(null);
    setLastCreatedPassword(null);

    const res = await fetch("/api/admin/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workerForm),
    });
    const json = await res.json();

    setWorkerSubmitting(false);

    if (!res.ok) {
      setWorkerError(json.error ?? "Could not add worker");
      return;
    }

    setLastCreatedPassword(json.tempPassword);
    setWorkerForm({ name: "", phone: "", email: "" });
    loadWorkers();
  }

  async function handleAddOperator(e: React.FormEvent) {
    e.preventDefault();
    setOperatorSubmitting(true);
    setOperatorError(null);
    setLastCreatedOperatorPassword(null);

    const res = await fetch("/api/admin/operators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: operatorEmail }),
    });
    const json = await res.json();

    setOperatorSubmitting(false);

    if (!res.ok) {
      setOperatorError(json.error ?? "Could not add operator");
      return;
    }

    setLastCreatedOperatorPassword(json.tempPassword);
    setOperatorEmail("");
    loadOperators();
  }

  async function toggleAvailable(worker: Worker) {
    await supabase
      .from("workers")
      .update({ available: !worker.available })
      .eq("id", worker.id);
    loadWorkers();
  }

  return (
    <>
      {printLocation && (
        <PrintableQrSign
          location={printLocation}
          onDone={() => setPrintLocation(null)}
        />
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

        <section className="space-y-3">
          <h2 className="font-semibold text-slate-900">Staff</h2>

          <form
            onSubmit={handleAddWorker}
            className="bg-white rounded-xl border border-slate-200 p-4 grid sm:grid-cols-3 gap-2"
          >
            <input
              required
              placeholder="Name"
              value={workerForm.name}
              onChange={(e) => setWorkerForm((f) => ({ ...f, name: e.target.value }))}
              className="input"
            />
            <input
              placeholder="Phone"
              value={workerForm.phone}
              onChange={(e) => setWorkerForm((f) => ({ ...f, phone: e.target.value }))}
              className="input"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={workerForm.email}
              onChange={(e) => setWorkerForm((f) => ({ ...f, email: e.target.value }))}
              className="input"
            />
            <button
              type="submit"
              disabled={workerSubmitting}
              className="sm:col-span-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2"
            >
              {workerSubmitting ? "Adding..." : "Add Staff"}
            </button>
          </form>

          {workerError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {workerError}
            </p>
          )}
          {lastCreatedPassword && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Staff created. Temporary password: <strong>{lastCreatedPassword}</strong> —
              share this with them so they can sign in at /login.
            </p>
          )}

          <div className="space-y-2">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{worker.name}</p>
                  <p className="text-xs text-slate-500">
                    {worker.email} {worker.phone ? `· ${worker.phone}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => toggleAvailable(worker)}
                  className={`text-xs font-medium rounded-full px-3 py-1 border ${
                    worker.available
                      ? "text-green-700 border-green-300 bg-green-50"
                      : "text-slate-500 border-slate-300 bg-slate-50"
                  }`}
                >
                  {worker.available ? "Available" : "Deactivated"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-slate-900">Supervisors</h2>

          <form
            onSubmit={handleAddOperator}
            className="bg-white rounded-xl border border-slate-200 p-4 flex gap-2"
          >
            <input
              required
              type="email"
              placeholder="Email"
              value={operatorEmail}
              onChange={(e) => setOperatorEmail(e.target.value)}
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={operatorSubmitting}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4"
            >
              {operatorSubmitting ? "Adding..." : "Add Supervisor"}
            </button>
          </form>

          {operatorError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {operatorError}
            </p>
          )}
          {lastCreatedOperatorPassword && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Supervisor created. Temporary password:{" "}
              <strong>{lastCreatedOperatorPassword}</strong> — share this with them so they
              can sign in at /login.
            </p>
          )}

          <div className="space-y-2">
            {operators.map((operator) => (
              <div
                key={operator.id}
                className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3"
              >
                <p className="text-sm text-slate-900">{operator.email}</p>
              </div>
            ))}
            {operators.length === 0 && (
              <p className="text-sm text-slate-400">No supervisors added yet.</p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-slate-900">Daily Report</h2>
          <DailyReport workers={workers} />
        </section>
      </div>
      </div>
    </>
  );
}
