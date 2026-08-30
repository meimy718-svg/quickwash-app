"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import DailyReport from "@/components/DailyReport";
import type { Worker } from "@/lib/types";

export default function AdminOverviewPage() {
  const supabase = useMemo(() => createClient(), []);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const loadWorkers = useCallback(async () => {
    const { data } = await supabase.from("workers").select("*").order("name");
    if (data) setWorkers(data as Worker[]);
  }, [supabase]);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  return (
    <div className="space-y-4">
      <h1 className="font-semibold text-slate-900">Overview</h1>
      <DailyReport workers={workers} />
    </div>
  );
}
