"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NewTransactionPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("reimbursable");
  const [notes, setNotes] = useState("");

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
      setError("You must be signed in to add a transaction.");
      setSubmitting(false);
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      setError("Please enter a valid amount.");
      setSubmitting(false);
      return;
    }

    const payload = {
      user_id: userData.user.id,
      date,
      amount: numericAmount,
      merchant,
      category,
      notes,
      reimbursement_billed: false,
      reimbursement_paid: false,
      payment_method_id: null,
      // teller_transaction_id intentionally left undefined
    };

    const { error: insertError } = await supabase
      .from("transactions")
      .insert([payload]);

    if (insertError) {
      setError(`Failed to save transaction: ${insertError.message}`);
      setSubmitting(false);
      return;
    }

    // Redirect to dashboard (Uncategorized/All view) after creation
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
          Enter Transaction
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manually create an expense. It will not be synced to a bank.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Merchant / Description
            </label>
            <input
              type="text"
              required
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="E.g. Office Supplies"
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
            >
              <option value="reimbursable">Reimbursable</option>
              <option value="personal">Personal</option>
              <option value="non-reimbursable">Tax Deductible</option>
              <option value="research needed">Research Needed</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
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
          {submitting ? "Saving..." : "Save Transaction"}
        </button>
      </form>
    </div>
  );
}
