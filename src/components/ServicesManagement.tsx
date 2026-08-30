"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Mall, Service } from "@/lib/types";

function ServiceRow({
  service,
  mallOptions,
  onSaved,
}: {
  service: Service;
  mallOptions?: string[];
  onSaved: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: service.name,
    price: String(service.price),
    mall: service.mall ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setForm({ name: service.name, price: String(service.price), mall: service.mall ?? "" });
    setError(null);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    if (!form.name.trim() || Number.isNaN(price) || price < 0) {
      setError("Enter a valid name and price");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("services")
      .update({
        name: form.name.trim(),
        price,
        ...(mallOptions ? { mall: form.mall } : {}),
      })
      .eq("id", service.id);

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditing(false);
    onSaved();
  }

  async function toggleAvailable() {
    setError(null);
    const { error: updateError } = await supabase
      .from("services")
      .update({ available: !service.available })
      .eq("id", service.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved();
  }

  async function toggleShowPrice() {
    setError(null);
    const { error: updateError } = await supabase
      .from("services")
      .update({ show_price: !service.show_price })
      .eq("id", service.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
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
        <div className="grid sm:grid-cols-2 gap-2">
          <input
            required
            placeholder="Service name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="input"
          />
          <input
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className="input"
          />
        </div>
        {mallOptions && (
          <select
            required
            value={form.mall}
            onChange={(e) => setForm((f) => ({ ...f, mall: e.target.value }))}
            className="input"
          >
            <option value="" disabled>
              Select mall
            </option>
            {mallOptions.map((m) => (
              <option key={m} value={m}>
                {m}
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
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 space-y-1">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-slate-900">
          {service.name}
          {!service.show_price && (
            <span className="ml-1 text-xs font-normal text-slate-400">
              (price hidden from customers)
            </span>
          )}
        </p>
        <p className="text-xs text-slate-500">
          ₹{service.price}
          {service.mall && ` · ${service.mall}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={startEdit}
          className="text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          Edit
        </button>
        <button
          onClick={toggleShowPrice}
          className={`text-xs font-medium rounded-full px-3 py-1 border ${
            service.show_price
              ? "text-blue-700 border-blue-300 bg-blue-50"
              : "text-slate-500 border-slate-300 bg-slate-50"
          }`}
        >
          {service.show_price ? "Price shown" : "Price hidden"}
        </button>
        <button
          onClick={toggleAvailable}
          className={`text-xs font-medium rounded-full px-3 py-1 border ${
            service.available
              ? "text-green-700 border-green-300 bg-green-50"
              : "text-slate-500 border-slate-300 bg-slate-50"
          }`}
        >
          {service.available ? "Available" : "Unavailable"}
        </button>
      </div>
      </div>
    </div>
  );
}

export default function ServicesManagement() {
  const supabase = useMemo(() => createClient(), []);
  const [services, setServices] = useState<Service[]>([]);
  const [malls, setMalls] = useState<Mall[]>([]);
  const [viewer, setViewer] = useState<{ role: string; location: string | null } | null>(
    null
  );
  const [form, setForm] = useState({ name: "", price: "", showPrice: true, mall: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setServices(data as Service[]);
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

  useEffect(() => {
    loadServices();
    loadMalls();
    loadViewer();
  }, [loadServices, loadMalls, loadViewer]);

  const isAdminViewer = viewer?.role === "admin";
  const mallNames = malls.map((m) => m.name);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    if (!form.name.trim() || Number.isNaN(price) || price < 0) {
      setError("Enter a valid name and price");
      return;
    }

    const mall = isAdminViewer ? form.mall : viewer?.location;
    if (!mall) {
      setError("Location is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("services").insert({
      name: form.name.trim(),
      price,
      available: true,
      show_price: form.showPrice,
      mall,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({ name: "", price: "", showPrice: true, mall: "" });
    loadServices();
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-slate-900">Services</h2>
      {!isAdminViewer && viewer?.location && (
        <p className="text-xs text-slate-500">
          You can only see and manage services at {viewer.location}.
        </p>
      )}

      <form
        onSubmit={handleAdd}
        className="bg-white rounded-xl border border-slate-200 p-4 grid sm:grid-cols-3 gap-2"
      >
        <input
          required
          placeholder="Service name (e.g. Full Detail)"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="input"
        />
        <input
          required
          type="number"
          min="0"
          step="0.01"
          placeholder="Price"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          className="input"
        />
        {isAdminViewer ? (
          <select
            required
            value={form.mall}
            onChange={(e) => setForm((f) => ({ ...f, mall: e.target.value }))}
            className="input"
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
        ) : (
          <button
            type="submit"
            disabled={submitting}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2"
          >
            {submitting ? "Adding..." : "Add Service"}
          </button>
        )}
        {isAdminViewer && (
          <button
            type="submit"
            disabled={submitting || mallNames.length === 0}
            className="sm:col-span-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2"
          >
            {submitting ? "Adding..." : "Add Service"}
          </button>
        )}
        <label className="sm:col-span-3 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.showPrice}
            onChange={(e) => setForm((f) => ({ ...f, showPrice: e.target.checked }))}
          />
          Show price to customers
        </label>
        {isAdminViewer && mallNames.length === 0 && (
          <p className="sm:col-span-3 text-xs text-slate-400">Add a mall first.</p>
        )}
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {services.map((service) => (
          <ServiceRow
            key={service.id}
            service={service}
            mallOptions={isAdminViewer ? mallNames : undefined}
            onSaved={loadServices}
          />
        ))}
        {services.length === 0 && (
          <p className="text-sm text-slate-400">No services added yet.</p>
        )}
      </div>
    </section>
  );
}
