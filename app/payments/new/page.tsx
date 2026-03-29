"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewPaymentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

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
      setError("You must be signed in to log a payment.");
      setSubmitting(false);
      return;
    }

    const numericAmount = parseFloat(amount.replace(/[^0-9.-]+/g,""));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid positive payment amount.");
      setSubmitting(false);
      return;
    }

    const payload = {
      user_id: userData.user.id,
      date,
      amount: numericAmount, // Positive amount
      merchant: "Client/Vendor", // Generic merchant name
      category: "reimbursable",
      notes: `[Advance Payment] ${description}`.trim(),
      reimbursement_billed: false,
      reimbursement_paid: false,
      payment_method_id: null,
    };

    const { error: insertError } = await supabase
      .from("transactions")
      .insert([payload]);

    if (insertError) {
      setError(`Failed to save payment: ${insertError.message}`);
      setSubmitting(false);
      return;
    }

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
          Log Payment Received
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Enter independent contractor payments or expense advances. These will be automatically deducted from your final "Total Due" on reports.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Date Received
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
              />
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-zinc-500">$</span>
                <input
                  type="text"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-transparent py-2 pl-7 pr-3 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Description <span className="text-zinc-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Wire Transfer, Check #1024"
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
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
          className="flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Payment"}
        </button>
      </form>
    </div>
  );
}
