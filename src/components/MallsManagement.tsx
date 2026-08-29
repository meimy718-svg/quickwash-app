"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Mall } from "@/lib/types";

export default function MallsManagement({ onChanged }: { onChanged?: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [malls, setMalls] = useState<Mall[]>([]);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMalls = useCallback(async () => {
    const { data } = await supabase.from("malls").select("*").order("name");
    if (data) setMalls(data as Mall[]);
  }, [supabase]);

  useEffect(() => {
    loadMalls();
  }, [loadMalls]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("malls")
      .insert({ name: name.trim() });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setName("");
    loadMalls();
    onChanged?.();
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-slate-900">Malls</h2>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          placeholder="e.g. Phoenix Mall"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4"
        >
          {submitting ? "Adding..." : "Add Mall"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {malls.map((mall) => (
          <span
            key={mall.id}
            className="text-sm bg-white border border-slate-200 rounded-full px-3 py-1 text-slate-700"
          >
            {mall.name}
          </span>
        ))}
        {malls.length === 0 && (
          <p className="text-sm text-slate-400">No malls added yet.</p>
        )}
      </div>
    </section>
  );
}
