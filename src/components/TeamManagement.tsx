"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Worker } from "@/lib/types";

export default function TeamManagement() {
  const supabase = useMemo(() => createClient(), []);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [staffForm, setStaffForm] = useState({ name: "", phone: "", password: "" });
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState(false);

  const [supForm, setSupForm] = useState({ name: "", phone: "", password: "" });
  const [supSubmitting, setSupSubmitting] = useState(false);
  const [supError, setSupError] = useState<string | null>(null);
  const [supSuccess, setSupSuccess] = useState(false);

  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const loadWorkers = useCallback(async () => {
    const { data } = await supabase.from("workers").select("*").order("name");
    if (data) setWorkers(data as Worker[]);
  }, [supabase]);

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .in("role", ["worker", "operator"])
      .order("created_at", { ascending: false });
    if (data) setProfiles(data as Profile[]);
  }, [supabase]);

  useEffect(() => {
    loadWorkers();
    loadProfiles();
  }, [loadWorkers, loadProfiles]);

  const supervisors = profiles.filter((p) => p.role === "operator");
  const workerProfileByWorkerId = new Map(
    profiles.filter((p) => p.role === "worker" && p.worker_id).map((p) => [p.worker_id, p])
  );

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setStaffSubmitting(true);
    setStaffError(null);
    setStaffSuccess(false);

    const res = await fetch("/api/admin/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staffForm),
    });
    const json = await res.json();

    setStaffSubmitting(false);

    if (!res.ok) {
      setStaffError(json.error ?? "Could not add staff");
      return;
    }

    setStaffSuccess(true);
    setStaffForm({ name: "", phone: "", password: "" });
    loadWorkers();
    loadProfiles();
  }

  async function handleAddSupervisor(e: React.FormEvent) {
    e.preventDefault();
    setSupSubmitting(true);
    setSupError(null);
    setSupSuccess(false);

    const res = await fetch("/api/admin/operators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supForm),
    });
    const json = await res.json();

    setSupSubmitting(false);

    if (!res.ok) {
      setSupError(json.error ?? "Could not add supervisor");
      return;
    }

    setSupSuccess(true);
    setSupForm({ name: "", phone: "", password: "" });
    loadProfiles();
  }

  async function toggleAvailable(worker: Worker) {
    await supabase
      .from("workers")
      .update({ available: !worker.available })
      .eq("id", worker.id);
    loadWorkers();
  }

  async function resetPassword(userId: string, label: string) {
    setResetMessage(null);
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const json = await res.json();

    if (!res.ok) {
      setResetMessage(json.error ?? "Could not reset password");
      return;
    }

    setResetMessage(`New password for ${label}: ${json.tempPassword}`);
  }

  return (
    <div className="space-y-8">
      {resetMessage && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {resetMessage}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Staff</h2>

        <form
          onSubmit={handleAddStaff}
          className="bg-white rounded-xl border border-slate-200 p-4 grid sm:grid-cols-3 gap-2"
        >
          <input
            required
            placeholder="Name"
            value={staffForm.name}
            onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))}
            className="input"
          />
          <input
            required
            type="tel"
            placeholder="Phone"
            value={staffForm.phone}
            onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))}
            className="input"
          />
          <input
            required
            type="text"
            inputMode="numeric"
            minLength={4}
            placeholder="Password (min 4 chars)"
            value={staffForm.password}
            onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))}
            className="input"
          />
          <button
            type="submit"
            disabled={staffSubmitting}
            className="sm:col-span-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2"
          >
            {staffSubmitting ? "Adding..." : "Add Staff"}
          </button>
        </form>

        {staffError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {staffError}
          </p>
        )}
        {staffSuccess && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Staff created. They can sign in at /login with their phone number and the
            password you set.
          </p>
        )}

        <div className="space-y-2">
          {workers.map((worker) => {
            const profile = workerProfileByWorkerId.get(worker.id);
            return (
              <div
                key={worker.id}
                className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{worker.name}</p>
                  <p className="text-xs text-slate-500">{worker.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  {profile && (
                    <button
                      onClick={() => resetPassword(profile.id, worker.name)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      Reset password
                    </button>
                  )}
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
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Supervisors</h2>

        <form
          onSubmit={handleAddSupervisor}
          className="bg-white rounded-xl border border-slate-200 p-4 grid sm:grid-cols-3 gap-2"
        >
          <input
            required
            placeholder="Name"
            value={supForm.name}
            onChange={(e) => setSupForm((f) => ({ ...f, name: e.target.value }))}
            className="input"
          />
          <input
            required
            type="tel"
            placeholder="Phone"
            value={supForm.phone}
            onChange={(e) => setSupForm((f) => ({ ...f, phone: e.target.value }))}
            className="input"
          />
          <input
            required
            type="text"
            inputMode="numeric"
            minLength={4}
            placeholder="Password (min 4 chars)"
            value={supForm.password}
            onChange={(e) => setSupForm((f) => ({ ...f, password: e.target.value }))}
            className="input"
          />
          <button
            type="submit"
            disabled={supSubmitting}
            className="sm:col-span-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2"
          >
            {supSubmitting ? "Adding..." : "Add Supervisor"}
          </button>
        </form>

        {supError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {supError}
          </p>
        )}
        {supSuccess && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Supervisor created. They can sign in at /login with their phone number and the
            password you set.
          </p>
        )}

        <div className="space-y-2">
          {supervisors.map((sup) => (
            <div
              key={sup.id}
              className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-900">{sup.name}</p>
                <p className="text-xs text-slate-500">{sup.phone}</p>
              </div>
              <button
                onClick={() => resetPassword(sup.id, sup.name ?? "supervisor")}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Reset password
              </button>
            </div>
          ))}
          {supervisors.length === 0 && (
            <p className="text-sm text-slate-400">No supervisors added yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
