"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NewTripPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isOngoing, setIsOngoing] = useState(false);
  const [airline, setAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);

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

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setError("You must be signed in to add a trip.");
      setSubmitting(false);
      return;
    }

    if (!isOngoing && new Date(startDate) > new Date(endDate)) {
      setError("End date must be after or equal to start date.");
      setSubmitting(false);
      return;
    }

    // Calc days optionally
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
      user_id: userData.user.id,
      city,
      start_date: startDate,
      end_date: finalEndDate,
      total_days: totalDays,
      airline: airline || null,
      flight_number: flightNumber || null,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("trips")
      .insert([payload])
      .select('id')
      .single();

    if (insertError || !inserted) {
      setError(`Failed to save trip: ${insertError?.message || 'Unknown error'}`);
      setSubmitting(false);
      return;
    }

    const tripId = inserted.id;

    if (file) {
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${userData.user.id}/trips/${tripId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(filePath, file);
          
        if (!uploadError) {
          await supabase.from("trips").update({ flight_receipt_url: filePath }).eq('id', tripId);
        }
      } catch (err) {
        console.error("Failed to upload ticket", err);
      }
    }

    // Force teller sync to re-run on background/refetch maybe?
    // Not explicitly necessary, if they sync it will compute correctly.
    router.push("/dashboard");
    router.refresh();
  };

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
          Log Work Trip
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Add dates worked in a city to properly calculate labor and automatically categorize expenses.
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
              placeholder="e.g. Orlando"
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
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
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
              />
            </div>
            {isOngoing ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100 opacity-60">
                  End Date (disabled)
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
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
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
              Trip is ongoing (return date unknown)
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
                placeholder="e.g. Delta"
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
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
                placeholder="e.g. DL123"
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Ticket Photo or Confirmation (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setFile(e.target.files[0]);
                } else {
                  setFile(null);
                }
              }}
              className="block w-full text-sm text-zinc-500 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-300 dark:hover:file:bg-zinc-700"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Trip"}
        </button>
      </form>
    </div>
  );
}
