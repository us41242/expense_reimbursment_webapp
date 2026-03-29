"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function ActiveTripBanner() {
  const [activeTrip, setActiveTrip] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .is('end_date', null)
        .order('start_date', { ascending: false })
        .limit(1)
        .single();
        
      if (data) {
        setActiveTrip(data);
      }
    }
    load();
  }, []);

  if (!activeTrip) return null;

  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format;

  return (
    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 className="text-emerald-800 dark:text-emerald-200 font-bold text-lg flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          Active Work Trip: {activeTrip.city}
        </h2>
        <p className="text-emerald-700 dark:text-emerald-400 text-sm mt-1">
          Started on {fmt(new Date(activeTrip.start_date + "T12:00:00"))}. All new expenses are mapping to Reimbursable.
        </p>
      </div>
      <Link
        href={`/trips/${activeTrip.id}`}
        className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
      >
        Close Out Trip
      </Link>
    </div>
  );
}
