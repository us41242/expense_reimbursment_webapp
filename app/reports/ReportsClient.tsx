"use client";

import { useTransactions } from "@/context/TransactionContext";
import type { Transaction } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function ReportsClient() {
  const {
    hydrated,
    configMissing,
    signedIn,
    transactions,
    batchUpdateReimbursements,
  } = useTransactions();

  const [activeTab, setActiveTab] = useState<"unbilled" | "billed" | "paid">("unbilled");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unbilledTxs = useMemo(
    () =>
      transactions
        .filter((t) => t.category === "reimbursable" && !t.reimbursementBilled && !t.reimbursementPaid)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [transactions],
  );

  const billedTxs = useMemo(
    () =>
      transactions
        .filter((t) => t.category === "reimbursable" && t.reimbursementBilled && !t.reimbursementPaid)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [transactions],
  );

  const paidTxs = useMemo(
    () =>
      transactions
        .filter((t) => t.category === "reimbursable" && t.reimbursementPaid)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [transactions],
  );

  const activeTxs =
    activeTab === "unbilled"
      ? unbilledTxs
      : activeTab === "billed"
      ? billedTxs
      : paidTxs;

  const handleBatchBilled = async () => {
    if (unbilledTxs.length === 0) return;
    setIsSubmitting(true);
    const ids = unbilledTxs.map((t) => t.id);
    await batchUpdateReimbursements(ids, { reimbursement_billed: true });
    setIsSubmitting(false);
  };

  const handleBatchPaid = async () => {
    if (billedTxs.length === 0) return;
    setIsSubmitting(true);
    const ids = billedTxs.map((t) => t.id);
    await batchUpdateReimbursements(ids, { reimbursement_paid: true });
    setIsSubmitting(false);
  };

  if (!hydrated) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (configMissing) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Configure Supabase to load reimbursements.
      </p>
    );
  }

  if (!signedIn) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Sign in to view reimbursements.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="flex w-full overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900/60 md:w-auto">
          <button
            onClick={() => setActiveTab("unbilled")}
            className={`flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "unbilled"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Unbilled ({unbilledTxs.length})
          </button>
          <button
            onClick={() => setActiveTab("billed")}
            className={`flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "billed"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Billed ({billedTxs.length})
          </button>
          <button
            onClick={() => setActiveTab("paid")}
            className={`flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "paid"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Paid ({paidTxs.length})
          </button>
        </div>

        <Link
          href="/reports/export"
          className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-900 whitespace-nowrap"
        >
          Export current view
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col">
          {activeTxs.length === 0 ? (
            <div className="px-4 py-12 text-center text-zinc-500">
              No items in this tab.
            </div>
          ) : (
            activeTxs.map((t) => <ReportRow key={t.id} tx={t} />)
          )}
        </div>

        {/* Action Bar */}
        {activeTab === "unbilled" && activeTxs.length > 0 && (
          <div className="no-print flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {activeTxs.length} item{activeTxs.length === 1 ? "" : "s"} ready to bill
            </span>
            <button
              onClick={() => void handleBatchBilled()}
              disabled={isSubmitting}
              className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
            >
              {isSubmitting ? "Updating..." : "Mark all as Billed"}
            </button>
          </div>
        )}

        {activeTab === "billed" && activeTxs.length > 0 && (
          <div className="no-print flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Waiting for reimbursement on {activeTxs.length} item{activeTxs.length === 1 ? "" : "s"}
            </span>
            <button
              onClick={() => void handleBatchPaid()}
              disabled={isSubmitting}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:text-blue-950 dark:hover:bg-blue-400"
            >
              {isSubmitting ? "Updating..." : "Mark all as Paid"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportRow({ tx }: { tx: Transaction }) {
  const d = new Date(tx.date + "T12:00:00");

  return (
    <div className="flex flex-col gap-3 border-b border-zinc-200 bg-white p-4 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:hover:bg-zinc-900/40 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
          {tx.receiptImageUrl ? (
            <Link href={`/transactions/${tx.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tx.receiptImageUrl}
                alt="Receipt"
                className="h-full w-full object-cover transition hover:opacity-80"
              />
            </Link>
          ) : (
            <Link
              href={`/transactions/${tx.id}`}
              className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              Add
            </Link>
          )}
        </div>
        
        <div className="flex flex-col">
          <Link
            href={`/transactions/${tx.id}`}
            className="text-[15px] font-bold tracking-tight text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
          >
            {tx.merchant}
          </Link>
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {dateFmt.format(d)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800 sm:border-0 sm:pt-0">
        <span className="text-sm font-medium text-zinc-500 sm:hidden">Amount</span>
        <span className={`text-lg font-bold tabular-nums tracking-tight sm:text-[15px] ${tx.amount < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-50'}`}>
          {tx.amount < 0 ? `+${money.format(Math.abs(tx.amount))}` : money.format(tx.amount)}
        </span>
      </div>
    </div>
  );
}
