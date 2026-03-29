"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isOngoing, setIsOngoing] = useState(false);
  const [airline, setAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");

  useEffect(() => {
    async function fetchTrip() {
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", resolvedParams.id)
        .single();

      if (error || !data) {
        setError("Failed to load trip details.");
        setLoading(false);
        return;
      }

      setCity(data.city);
      setStartDate(data.start_date);
      setAirline(data.airline || "");
      setFlightNumber(data.flight_number || "");
      
      if (data.end_date) {
        setEndDate(data.end_date);
        setIsOngoing(false);
      } else {
        setEndDate(new Date().toISOString().split('T')[0]);
        setIsOngoing(true);
      }
      
      setLoading(false);
    }
    fetchTrip();
  }, [resolvedParams.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    if (!supabase) {
      setError("Database context is missing.");
      setSubmitting(false);
      return;
    }

    if (!isOngoing && new Date(startDate) > new Date(endDate)) {
      setError("End date must be after or equal to start date.");
      setSubmitting(false);
      return;
    }

    let totalDays: number | null = null;
    let finalEndDate: string | null = null;
    
    if (!isOngoing) {
      finalEndDate = endDate;
      const s = new Date(startDate + "T12:00:00");
      const en = new Date(endDate + "T12:00:00");
      const diffTime = Math.abs(en.getTime() - s.getTime());
      totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const payload = {
      city,
      start_date: startDate,
      end_date: finalEndDate,
      total_days: totalDays,
      airline: airline || null,
      flight_number: flightNumber || null,
    };

    const { error: updateError } = await supabase
      .from("trips")
      .update(payload)
      .eq('id', resolvedParams.id);

    if (updateError) {
      setError(`Failed to save trip: ${updateError.message}`);
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this trip? This will affect your reimbursement calculations.")) return;
    
    setSubmitting(true);
    const supabase = createClient();
    if (!supabase) return;

    const { error: deleteError } = await supabase
      .from("trips")
      .delete()
      .eq("id", resolvedParams.id);

    if (deleteError) {
      setError(`Failed to delete trip: ${deleteError.message}`);
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  if (loading) return <div className="p-10 text-center">Loading Trip...</div>;

  return (
    <div className="mx-auto max-w-lg space-y-8 p-4 pt-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back
        </button>
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Edit Work Trip
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Update trip details or close out an ongoing trip to lock in your labor calculation.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              City
            </label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
              />
            </div>
            
            {isOngoing ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100 opacity-60">
                  End Date
                </label>
                <input
                  type="text"
                  disabled
                  value="TBD"
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ongoing"
              checked={isOngoing}
              onChange={(e) => setIsOngoing(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-700 dark:ring-offset-zinc-900 dark:checked:bg-emerald-500"
            />
            <label htmlFor="ongoing" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Trip is still ongoing
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Airline <span className="text-zinc-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Flight # <span className="text-zinc-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Trip"}
          </button>
          
          <button
            type="button"
            disabled={submitting}
            onClick={handleDelete}
            className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 px-6 py-3 text-sm font-semibold transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
          >
            Delete Trip
          </button>
        </div>
      </form>
    </div>
  );
}
