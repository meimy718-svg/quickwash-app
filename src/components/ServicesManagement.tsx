"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/lib/types";

function ServiceRow({ service, onSaved }: { service: Service; onSaved: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: service.name, price: String(service.price) });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setForm({ name: service.name, price: String(service.price) });
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
      .update({ name: form.name.trim(), price })
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
    await supabase
      .from("services")
      .update({ available: !service.available })
      .eq("id", service.id);
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
        <p className="font-medium text-slate-900">{service.name}</p>
        <p className="text-xs text-slate-500">₹{service.price}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={startEdit}
          className="text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          Edit
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
  );
}

export default function ServicesManagement() {
  const supabase = useMemo(() => createClient(), []);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({ name: "", price: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setServices(data as Service[]);
  }, [supabase]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    if (!form.name.trim() || Number.isNaN(price) || price < 0) {
      setError("Enter a valid name and price");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("services")
      .insert({ name: form.name.trim(), price, available: true });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({ name: "", price: "" });
    loadServices();
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-slate-900">Services</h2>

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
        <button
          type="submit"
          disabled={submitting}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2"
        >
          {submitting ? "Adding..." : "Add Service"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {services.map((service) => (
          <ServiceRow key={service.id} service={service} onSaved={loadServices} />
        ))}
        {services.length === 0 && (
          <p className="text-sm text-slate-400">No services added yet.</p>
        )}
      </div>
    </section>
  );
}
