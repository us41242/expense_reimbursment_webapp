"use client";

import { useTransactions } from "@/context/TransactionContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useMemo } from "react";
import { Plus, Check, Trash2, ArrowRightLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Transaction } from "@/lib/types";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const MAX_BYTES = 2.5 * 1024 * 1024;

type Props = { id: string };

export function TransactionDetailClient({ id }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    transactions,
    hydrated,
    configMissing,
    signedIn,
    uploadReceiptImage,
    removeReceiptImage,
    setReimbursementBilled,
    setReimbursementPaid,
    setTransactionNote,
    setCategory,
    clearCategory,
    refresh,
  } = useTransactions();

  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [togglingAdvance, setTogglingAdvance] = useState(false);

  const tx = transactions.find((t) => t.id === id);
  const [isAdvanceEditorOpen, setIsAdvanceEditorOpen] = useState(tx?.notes?.includes("[Advance Payment]") || false);

  const onFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file (PNG, JPG, or screenshot).");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Image is too large. Try a file under 2.5 MB.");
        return;
      }
      setUploading(true);
      const { error: err } = await uploadReceiptImage(id, file);
      setUploading(false);
      if (err) setError(err);
    },
    [id, uploadReceiptImage],
  );

  const onRemove = useCallback(async () => {
    setError(null);
    setUploading(true);
    const { error: err } = await removeReceiptImage(id);
    setUploading(false);
    if (err) setError(err);
  }, [id, removeReceiptImage]);

  if (configMissing) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Configure Supabase environment variables to use cloud storage.
      </p>
    );
  }

  if (!hydrated) {
    return (
      <p className="text-sm text-zinc-500">Loading…</p>
    );
  }

  if (!signedIn) {
    return (
      <div className="space-y-4">
        <p className="text-zinc-600 dark:text-zinc-400">Sign in to view transactions.</p>
        <Link
          href="/login"
          className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="space-y-4">
        <p className="text-zinc-600 dark:text-zinc-400">Transaction not found.</p>
        <Link
          href="/uncategorized"
          className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Back to Uncategorized
        </Link>
      </div>
    );
  }

  const d = new Date(tx.date + "T12:00:00");
  const reimbursable = tx.category === "reimbursable";

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="no-print flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back
        </button>
        <Link
          href="/uncategorized"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Uncategorized
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {tx.merchant}
        </h1>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {money.format(tx.amount)}
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {dateFmt.format(d)}
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Category:{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {tx.category ?? "Uncategorized"}
          </span>
        </p>
        {tx.paymentMethodName ? (
          <p className="mt-1 text-sm text-zinc-500">
            Payment used:{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {tx.paymentMethodName}
            </span>
          </p>
        ) : null}
      </header>

      <section
        aria-labelledby="receipt-heading"
        className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40"
      >
        <h2
          id="receipt-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Receipt
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Upload a photo or screenshot. Files are stored in your Supabase{" "}
          <code className="text-[11px]">receipts</code> bucket.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Upload receipt image"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
            e.target.value = "";
          }}
        />

        {tx.receiptImageUrl ? (
          <div className="mt-4 space-y-3">
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tx.receiptImageUrl}
                alt={`Receipt for ${tx.merchant}`}
                className="max-h-80 w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Replace image
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => void onRemove()}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="mt-4 flex w-full flex-col items-center rounded-xl border-2 border-dashed border-zinc-300 bg-white px-6 py-12 text-center transition hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-950 dark:hover:border-zinc-500"
          >
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {uploading ? "Uploading…" : "Upload image or screenshot"}
            </span>
            <span className="mt-1 text-xs text-zinc-500">
              PNG, JPG, or HEIC — max 2.5 MB
            </span>
          </button>
        )}

        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="notes-heading"
        className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60"
      >
        <h2
          id="notes-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Notes
        </h2>
        <textarea
          className="mt-3 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
          rows={3}
          placeholder="Add a note (e.g., Client lunch with John Doe)..."
          defaultValue={tx.notes || ""}
          onBlur={async (e) => {
            setError(null);
            const res = await setTransactionNote(id, e.target.value);
            if (res.error) setError(res.error);
          }}
        />
        <p className="mt-2 text-[11px] text-zinc-500">
          Notes are saved automatically when you tap away.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Advance Payment</h2>
        <ToggleRow
          label="Advance Payment for Expenses"
          pressed={isAdvanceEditorOpen}
          disabled={togglingAdvance}
          onToggle={() => setIsAdvanceEditorOpen((prev) => !prev)}
        />
        
        {isAdvanceEditorOpen && (
           <AdvanceSettings tx={tx} transactions={transactions} refresh={refresh} setTogglingAdvance={setTogglingAdvance} submitting={togglingAdvance} />
        )}
      </section>

      {reimbursable && !isAdvanceEditorOpen && !tx.notes?.includes("[Advance Payment]") ? (
        <section
          aria-labelledby="reimbursement-heading"
          className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60"
        >
          <h2
            id="reimbursement-heading"
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Reimbursement
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Syncs with the Reports page. Marking as paid removes the expense from the unpaid
            list.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <ToggleRow
              label="Billed"
              pressed={tx.reimbursementBilled}
              onToggle={() =>
                void setReimbursementBilled(id, !tx.reimbursementBilled)
              }
            />
            <ToggleRow
              label="Paid"
              pressed={tx.reimbursementPaid}
              onToggle={() =>
                void setReimbursementPaid(id, !tx.reimbursementPaid)
              }
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ToggleRow({
  label,
  pressed,
  onToggle,
  disabled
}: {
  label: string;
  pressed: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex flex-1 items-center justify-between gap-4 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700 ${disabled ? "opacity-60" : ""}`}>
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={pressed}
        onClick={onToggle}
        disabled={disabled}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
          pressed
            ? "bg-emerald-600 dark:bg-emerald-500"
            : "bg-zinc-300 dark:bg-zinc-600"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            pressed ? "left-7" : "left-1"
          }`}
        />
        <span className="sr-only">
          {label}: {pressed ? "on" : "off"}
        </span>
      </button>
    </div>
  );
}

function AdvanceSettings({ tx, transactions, refresh, submitting, setTogglingAdvance }: { tx: Transaction; transactions: Transaction[]; refresh: () => Promise<void>; submitting: boolean; setTogglingAdvance: (b: boolean) => void }) {
  const router = useRouter();
  
  const d = new Date(tx.date + "T12:00:00");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  
  // Calculate UID
  const sameDayAdvances = useMemo(() => {
    return transactions
      .filter(t => t.notes?.includes("[Advance Payment]") && t.date === tx.date)
      .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [transactions, tx.date]);
  
  const idx = useMemo(() => {
    const foundIdx = sameDayAdvances.findIndex(t => t.id === tx.id);
    return foundIdx >= 0 ? foundIdx + 1 : sameDayAdvances.length + 1;
  }, [sameDayAdvances, tx.id]);

  const uid = `${idx}${mm}${dd}`;

  // Existing payouts
  const savedPayouts = useMemo(() => {
    return transactions.filter(t => t.merchant.startsWith(`Payout from ${uid}`));
  }, [transactions, uid]);

  const [payouts, setPayouts] = useState<{ id: string; name: string; amount: string }[]>(
    savedPayouts.length > 0 
      ? savedPayouts.map(pt => ({ id: pt.id, name: pt.merchant.replace(`Payout from ${uid} to `, ""), amount: pt.amount.toString() }))
      : [{ id: crypto.randomUUID(), name: "", amount: "" }]
  );

  const addPayout = () => {
    setPayouts([...payouts, { id: crypto.randomUUID(), name: "", amount: "" }]);
  };
  const removePayout = (id: string) => {
    setPayouts(payouts.filter(p => p.id !== id));
  };
  const updatePayout = (id: string, field: "name"|"amount", val: string) => {
    setPayouts(payouts.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const saveSplits = async () => {
    const valid = payouts.filter(p => p.name && parseFloat(p.amount) > 0);
    
    setTogglingAdvance(true);
    const supabase = createClient();
    if (!supabase) { setTogglingAdvance(false); return alert("No database context."); }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) { setTogglingAdvance(false); return alert("Must be signed in."); }

    // 1. Delete all existing splits generated by this parent UID to prevent duplication
    const savedIds = savedPayouts.map(pt => pt.id);
    if (savedIds.length > 0) {
      await supabase.from("transactions").delete().in("id", savedIds);
    }

    // 2. Update the Parent Transaction to push it purely into Unbilled
    const { error: parentErr } = await supabase.from("transactions").update({
      category: "reimbursable",
      notes: tx.notes?.includes("[Advance Payment]") ? tx.notes : `[Advance Payment] ${tx.notes || ""}`.trim(),
      reimbursement_billed: false,
      reimbursement_paid: false,
      payment_method_id: null
    }).eq("id", tx.id);

    if (parentErr) {
      setTogglingAdvance(false);
      return alert("Failed linking parent advance: " + parentErr.message);
    }

    // 3. Insert newly mapped splits locally configured in the UI form
    if (valid.length > 0) {
      const payload = valid.map(p => ({
        user_id: userData.user.id,
        amount: parseFloat(p.amount),
        date: tx.date,
        category: "reimbursable",
        merchant: `Payout from ${uid} to ${p.name}`,
        reimbursement_billed: false,
        reimbursement_paid: false,
        payment_method_id: null,
      }));

      const { error: splitsErr } = await supabase.from("transactions").insert(payload);
      if (splitsErr) {
        alert(`Error saving payout splits: ${splitsErr.message}`);
      }
    }

    await refresh();
    setTogglingAdvance(false);
    router.back();
  };

  const totalRawAmount = Math.abs(tx.amount);

  return (
    <div className="mt-5 border-t border-zinc-200 dark:border-zinc-800 pt-5">
      <div className="text-[13px] font-mono text-zinc-900 dark:text-zinc-100 flex items-center justify-between mb-6 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-lg">
        <span className="font-semibold">Payment {uid} Received</span>
        <span className="font-bold">{money.format(totalRawAmount)}</span>
      </div>

      <div>
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">Did you use a portion of this payment to pay someone?</p>
        <div className="space-y-3">
          {payouts.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Name" 
                value={p.name} 
                onChange={(e) => updatePayout(p.id, "name", e.target.value)} 
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
              />
              <input 
                type="number" 
                placeholder="$0.00" 
                value={p.amount} 
                onChange={(e) => updatePayout(p.id, "amount", e.target.value)} 
                className="w-24 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
              />
              <button type="button" onClick={() => removePayout(p.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"><Trash2 className="h-4 w-4"/></button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={addPayout} className="self-start flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
            <Plus className="h-4 w-4" /> Add Split
          </button>
          
          <button type="button" onClick={saveSplits} disabled={submitting} className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all">
            {submitting ? "Saving..." : "Complete"}
          </button>
        </div>
      </div>
    </div>
  );
}
