"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Mall, Profile, Worker } from "@/lib/types";

function TeamMemberRow({
  userId,
  name,
  phone,
  location,
  locationOptions,
  extra,
  onSaved,
}: {
  userId: string | undefined;
  name: string;
  phone: string;
  location?: string | null;
  locationOptions?: string[];
  extra?: React.ReactNode;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name,
    phone,
    password: "",
    location: location ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setForm({ name, phone, password: "", location: location ?? "" });
    setError(null);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        name: form.name,
        phone: form.phone,
        password: form.password || undefined,
        location: locationOptions ? form.location : undefined,
      }),
    });
    const json = await res.json();

    setSubmitting(false);

    if (!res.ok) {
      setError(json.error ?? "Could not save changes");
      return;
    }

    setEditing(false);
    onSaved();
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        className="bg-white rounded-xl border border-blue-300 px-4 py-3 space-y-2"
      >
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
            {error}
          </p>
        )}
        <div className="grid sm:grid-cols-3 gap-2">
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="input"
          />
          <input
            required
            type="tel"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="input"
          />
          <input
            type="text"
            inputMode="numeric"
            minLength={4}
            placeholder="New password (optional)"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="input"
          />
        </div>
        {locationOptions && (
          <select
            required
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="input"
          >
            <option value="" disabled>
              Select mall
            </option>
            {locationOptions.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-full px-3 py-1.5"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-medium text-slate-500 border border-slate-300 rounded-full px-3 py-1.5"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3">
      <div>
        <p className="font-medium text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">
          {phone}
          {location && ` · ${location}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {userId && (
          <button
            onClick={startEdit}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
        )}
        {extra}
      </div>
    </div>
  );
}

export default function TeamManagement() {
  const supabase = useMemo(() => createClient(), []);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [malls, setMalls] = useState<Mall[]>([]);
  const [viewer, setViewer] = useState<{ role: string; location: string | null } | null>(
    null
  );

  const [staffForm, setStaffForm] = useState({ name: "", phone: "", password: "", location: "" });
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState(false);

  const [supForm, setSupForm] = useState({ name: "", phone: "", password: "", location: "" });
  const [supSubmitting, setSupSubmitting] = useState(false);
  const [supError, setSupError] = useState<string | null>(null);
  const [supSuccess, setSupSuccess] = useState(false);

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

  const loadMalls = useCallback(async () => {
    const { data } = await supabase.from("malls").select("*").order("name");
    if (data) setMalls(data as Mall[]);
  }, [supabase]);

  const loadViewer = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("role, location")
      .eq("id", user.id)
      .single();
    if (data) setViewer(data);
  }, [supabase]);

  const refresh = useCallback(() => {
    loadWorkers();
    loadProfiles();
  }, [loadWorkers, loadProfiles]);

  useEffect(() => {
    refresh();
    loadMalls();
    loadViewer();
  }, [refresh, loadMalls, loadViewer]);

  const isAdminViewer = viewer?.role === "admin";
  const mallNames = malls.map((m) => m.name);
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
    setStaffForm({ name: "", phone: "", password: "", location: "" });
    refresh();
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
    setSupForm({ name: "", phone: "", password: "", location: "" });
    refresh();
  }

  async function toggleAvailable(worker: Worker) {
    await supabase
      .from("workers")
      .update({ available: !worker.available })
      .eq("id", worker.id);
    loadWorkers();
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Staff</h2>
        {!isAdminViewer && viewer?.location && (
          <p className="text-xs text-slate-500">
            You can only see and manage Staff at {viewer.location}.
          </p>
        )}

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
          {isAdminViewer && (
            <select
              required
              value={staffForm.location}
              onChange={(e) => setStaffForm((f) => ({ ...f, location: e.target.value }))}
              className="input sm:col-span-2"
            >
              <option value="" disabled>
                Select mall
              </option>
              {mallNames.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={staffSubmitting || (isAdminViewer && mallNames.length === 0)}
            className={`bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2 ${
              isAdminViewer ? "" : "sm:col-span-3"
            }`}
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
              <TeamMemberRow
                key={worker.id}
                userId={profile?.id}
                name={worker.name}
                phone={worker.phone ?? ""}
                location={worker.location}
                locationOptions={isAdminViewer ? mallNames : undefined}
                onSaved={refresh}
                extra={
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
                }
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Supervisors</h2>
        <p className="text-xs text-slate-500">
          Each supervisor only sees bookings and activity for their assigned mall /
          location.
        </p>

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
          <select
            required
            value={supForm.location}
            onChange={(e) => setSupForm((f) => ({ ...f, location: e.target.value }))}
            className="input sm:col-span-2"
          >
            <option value="" disabled>
              Select mall
            </option>
            {mallNames.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={supSubmitting || mallNames.length === 0}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2"
          >
            {supSubmitting ? "Adding..." : "Add Supervisor"}
          </button>
          {mallNames.length === 0 && (
            <p className="sm:col-span-3 text-xs text-slate-400">
              Add a mall first.
            </p>
          )}
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
            <TeamMemberRow
              key={sup.id}
              userId={sup.id}
              name={sup.name ?? ""}
              phone={sup.phone ?? ""}
              location={sup.location}
              locationOptions={mallNames}
              onSaved={refresh}
            />
          ))}
          {supervisors.length === 0 && (
            <p className="text-sm text-slate-400">No supervisors added yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
