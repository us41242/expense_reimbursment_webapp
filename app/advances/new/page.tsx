"use client";

import { useTransactions } from "@/context/TransactionContext";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { ArrowLeft, Check, Plus, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewAdvancePage() {
  const router = useRouter();
  const { refresh } = useTransactions();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceNote, setAdvanceNote] = useState("Company Advance");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  
  // Team payouts nested state list
  const [payouts, setPayouts] = useState<{ id: string; name: string; amount: string }[]>([]);

  const addPayout = () => {
    setPayouts([...payouts, { id: crypto.randomUUID(), name: "", amount: "" }]);
  };

  const removePayout = (id: string) => {
    setPayouts(payouts.filter((p) => p.id !== id));
  };

  const updatePayout = (id: string, field: "name" | "amount", value: string) => {
    setPayouts(payouts.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const totalPayouts = payouts.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const netAdvance = (parseFloat(advanceAmount) || 0) - totalPayouts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const baseAmount = parseFloat(advanceAmount);
    if (!baseAmount || baseAmount <= 0) return alert("Please enter a valid advance amount.");

    setIsSubmitting(true);
    console.log("Starting advance submission. Amount:", baseAmount);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Database configuration missing.");

      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) throw new Error("You must be signed in. Please log in again.");

      const payload = [];

      // 1. Advance transaction (negative amount)
      payload.push({
        user_id: userData.user.id,
        amount: -baseAmount,
        date,
        merchant: advanceNote || "Advance Received",
        category: "advance",
        reimbursement_billed: true, 
        reimbursement_paid: true,
        payment_method_id: null,
      });

      // 2. Team payouts as new reinstatable expenses
      payouts.forEach((p) => {
        const payoutVal = parseFloat(p.amount);
        if (payoutVal && payoutVal > 0) {
          payload.push({
            user_id: userData.user.id,
            amount: payoutVal,
            date,
            merchant: p.name ? `Team Payout: ${p.name}` : "Team Payout",
            category: "reimbursable",
            reimbursement_billed: false, 
            reimbursement_paid: false,
            payment_method_id: null,
          });
        }
      });

      console.log("Preparing to insert payload:", payload);
      const { error: insertError } = await supabase.from("transactions").insert(payload);

      if (insertError) {
        throw new Error(`Database Error: ${insertError.message}`);
      }
      
      console.log("Insert successful. Refreshing global transaction state...");
      await refresh();
      
      console.log("Routing back to dashboard...");
      router.push("/dashboard");

    } catch (err: any) {
      console.error("Advance persistence failed:", err);
      alert(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 mb:py-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shadow-inner dark:bg-orange-500/20 dark:text-orange-400">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 md:text-3xl">
            Log an Advance
          </h1>
          <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Record manual off-cycle payments received towards your expenses.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core Advance Block */}
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white/60 p-6 backdrop-blur-xl shadow-sm dark:border-white/5 dark:bg-zinc-900/50 sm:p-8">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-6">Payment Received</h2>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Amount Received
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-zinc-50 py-3.5 pl-8 pr-4 font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-50 dark:focus:border-orange-500"
                  placeholder="1000.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Date Received
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 py-3.5 px-4 font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-50"
              />
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Note / Origin (Optional)
              </label>
              <input
                type="text"
                value={advanceNote}
                onChange={(e) => setAdvanceNote(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 py-3.5 px-4 font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-50"
                placeholder="e.g. Company Wire #4512"
              />
            </div>
          </div>
        </section>

        {/* Team Payouts Splits Block */}
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white/60 p-6 backdrop-blur-xl shadow-sm dark:border-white/5 dark:bg-zinc-900/50 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Team Payouts</h2>
              <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Did you use a portion of this advance to pay others?
              </p>
            </div>
            <button
              type="button"
              onClick={addPayout}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <Plus className="h-4 w-4" />
              Add Split
            </button>
          </div>

          {payouts.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-zinc-200 py-8 text-center dark:border-zinc-800">
              <p className="text-sm font-medium text-zinc-500">No team payouts attached.</p>
              <p className="mt-1 text-xs text-zinc-400 text-balance px-4">
                The entire advance will be credited strictly against your own owed expenses.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      placeholder={`Worker Name (e.g. Gokan)`}
                      value={p.name}
                      onChange={(e) => updatePayout(p.id, "name", e.target.value)}
                      className="w-full rounded-xl border border-zinc-300 bg-zinc-50 py-3 px-4 font-semibold text-zinc-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-50 dark:focus:border-orange-500"
                    />
                  </div>
                  <div className="relative w-32 shrink-0 sm:w-40">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={p.amount}
                      onChange={(e) => updatePayout(p.id, "amount", e.target.value)}
                      className="w-full rounded-xl border border-zinc-300 bg-zinc-50 pl-8 pr-3 py-3 font-semibold text-zinc-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-50 dark:focus:border-orange-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePayout(p.id)}
                    className="shrink-0 rounded-xl p-3 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors dark:hover:bg-red-950/30 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Calculation Banner */}
        <div className="flex flex-col gap-2 rounded-2xl bg-orange-50 p-6 dark:bg-orange-500/10">
          <div className="flex justify-between text-sm font-semibold text-orange-800/80 dark:text-orange-200/60">
            <span>Total Received</span>
            <span>${(parseFloat(advanceAmount) || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-orange-800/80 dark:text-orange-200/60">
            <span>Sub-payouts Logged</span>
            <span>-${totalPayouts.toFixed(2)}</span>
          </div>
          <div className="mt-2 border-t border-orange-200 pt-3 dark:border-orange-500/20 flex justify-between items-center">
            <span className="font-bold text-orange-900 dark:text-orange-100">Net Advance Against Your Tab</span>
            <span className="text-xl font-black tabular-nums tracking-tight text-orange-700 dark:text-orange-400">
              ${netAdvance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || netAdvance < 0}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 px-6 py-4 font-bold text-white shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02] hover:shadow-orange-500/40 active:scale-95 disabled:scale-100 disabled:opacity-60"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : (
              <>
                <Check className="h-5 w-5" />
                Commit Advance Bundle to Ledger
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
